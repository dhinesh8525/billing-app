# Architecture Overview

This document describes the architecture of the Billing App, a multi-tenant SaaS application built with Next.js 14.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Browser   │  │  Mobile PWA │  │  API Client │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js App Router                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Server         │  │  Route          │  │  Middleware     │  │
│  │  Components     │  │  Handlers       │  │  (Auth/Tenant)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ Billing   │ │ Product   │ │ Party     │ │ Settings  │       │
│  │ Service   │ │ Service   │ │ Service   │ │ Service   │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ Alert     │ │ Audit     │ │ Plan      │ │ API Key   │       │
│  │ Service   │ │ Service   │ │ Service   │ │ Service   │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Prisma ORM                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Modular Monolith

The application follows a modular monolith architecture:

- **Single Deployment Unit** - Simplified operations and deployment
- **Clear Domain Boundaries** - Services organized by business domain
- **Shared Database Transactions** - Critical for billing integrity
- **Future Microservices Ready** - Can be extracted if needed

### 2. Multi-Tenancy

```
┌─────────────────────────────────────────┐
│              Application                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Tenant A │ │Tenant B │ │Tenant C │   │
│  │ Data    │ │ Data    │ │ Data    │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│         Shared Database                  │
│    (Row-level tenant isolation)          │
└─────────────────────────────────────────┘
```

**Implementation:**
- Every data model includes `tenantId` field
- All queries filter by `tenantId` automatically
- Middleware validates tenant context on every request
- Users can belong to multiple tenants (workspaces)

### 3. Service Layer Pattern

```typescript
// services/billing.service.ts
export class BillingService {
  // All business logic encapsulated here
  static async createInvoice(tenantId: string, data: CreateInvoiceInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate stock availability
      // 2. Create invoice with items
      // 3. Decrement stock atomically
      // 4. Update party balance
      // 5. Create audit log
    })
  }
}
```

**Benefits:**
- Business logic separated from routes
- Reusable across API routes and server components
- Easier to test in isolation
- Transaction management centralized

## Data Flow

### Invoice Creation Flow

```
User Action          API Route           Service Layer         Database
    │                    │                    │                    │
    │  Submit Invoice    │                    │                    │
    │───────────────────>│                    │                    │
    │                    │  createInvoice()   │                    │
    │                    │───────────────────>│                    │
    │                    │                    │  BEGIN TRANSACTION │
    │                    │                    │───────────────────>│
    │                    │                    │  Check Stock       │
    │                    │                    │<──────────────────>│
    │                    │                    │  Create Invoice    │
    │                    │                    │───────────────────>│
    │                    │                    │  Create Items      │
    │                    │                    │───────────────────>│
    │                    │                    │  Update Stock      │
    │                    │                    │───────────────────>│
    │                    │                    │  COMMIT            │
    │                    │                    │───────────────────>│
    │                    │  Invoice Created   │                    │
    │                    │<───────────────────│                    │
    │  Success Response  │                    │                    │
    │<───────────────────│                    │                    │
```

## Database Schema

### Core Entities

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Tenant    │────<│    User      │>────│  Membership  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Product    │     │   Invoice    │────<│ InvoiceItem  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│   Category   │     │    Party     │
└──────────────┘     └──────────────┘
```

### Key Design Decisions

1. **Invoice Items Store Snapshots**
   - Product name, SKU, price copied at creation
   - Changes to products don't affect past invoices
   - `productId` kept for reporting only

2. **Atomic Stock Management**
   - Prisma transactions with serializable isolation
   - Double-check pattern prevents overselling
   - Stock decremented only after invoice committed

3. **Soft Deletes for Products**
   - `isActive` flag instead of deletion
   - Maintains referential integrity
   - Historical data preserved

## Authentication & Authorization

### Authentication Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│ Client │────>│ NextAuth   │────>│ Credentials│────>│ Database │
└────────┘     │ Middleware │     │ Provider   │     └──────────┘
               └────────────┘     └────────────┘
                     │
                     ▼
              ┌────────────┐
              │   JWT      │
              │  Session   │
              └────────────┘
```

### Authorization Levels

1. **Super Admin** - Platform-wide access
2. **Tenant Admin** - Full workspace access
3. **Tenant Member** - Limited workspace access
4. **API Key** - Programmatic access with scopes

## Caching Strategy

### Current Implementation
- No external cache (Redis) required
- Prisma connection pooling
- React Server Components for data fetching
- Client-side SWR-like patterns

### Future Considerations
- Redis for session storage at scale
- Cached aggregations for dashboard
- Rate limiting with sliding window

## Security Measures

1. **Input Validation** - Zod schemas on all inputs
2. **SQL Injection** - Prisma parameterized queries
3. **XSS Prevention** - React's default escaping
4. **CSRF Protection** - NextAuth built-in
5. **Rate Limiting** - API key quotas
6. **Audit Logging** - All mutations tracked

## Performance Optimizations

1. **Database Indexes**
   - Composite indexes for tenant + common queries
   - Full-text search indexes on product name/SKU

2. **Query Optimization**
   - Select only needed fields
   - Pagination with cursor-based option
   - Aggregations in database, not application

3. **Frontend**
   - Server Components reduce client JS
   - Streaming with Suspense
   - Optimistic updates for UX

## Scalability Path

### Current: Single Instance
- Suitable for most small-medium businesses
- PostgreSQL handles concurrent users well

### Future: Horizontal Scale
```
                    ┌─────────────┐
                    │ Load        │
                    │ Balancer    │
                    └─────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ App      │    │ App      │    │ App      │
   │ Instance │    │ Instance │    │ Instance │
   └──────────┘    └──────────┘    └──────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                   ┌──────────┐
                   │ Postgres │
                   │ (Primary)│
                   └──────────┘
```

Requirements for horizontal scaling:
- External session storage (Redis)
- Stateless application design (already done)
- Database connection pooling (PgBouncer)
