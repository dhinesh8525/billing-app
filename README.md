# Billing App - Restaurant POS & Multi-Tenant Billing Platform

A production-grade, multi-tenant billing and POS (Point of Sale) application built for restaurants and retail businesses. Features complete restaurant management with table handling, kitchen display system, recipe costing, and advanced billing operations.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)

## Features

### 🍽️ Restaurant POS (Petpooja-like)
- **Table Management** - Visual floor plan with drag-drop editor, real-time status tracking
- **Kitchen Display System (KDS)** - Full-screen kitchen view with order cards and item tracking
- **Kitchen Order Tickets (KOT)** - Auto-generated KOTs grouped by station
- **Recipe/BOM Management** - Ingredient tracking with food cost analysis
- **Split Bill** - Split by items, percentage, or equal division
- **Merge Tables** - Combine orders from multiple tables
- **Offline Mode** - Continue operations during network outages

### Core Billing
- **POS Interface** - Fast, keyboard-friendly point of sale
- **Invoice Generation** - GST-compliant invoices with CGST/SGST/IGST
- **Product Management** - Categories, HSN codes, tax rates
- **Inventory Tracking** - Real-time stock with low-stock alerts
- **Party Management** - Customers and suppliers with balance tracking

### Multi-Tenant SaaS
- **Workspace Isolation** - Complete data separation between tenants
- **Team Collaboration** - Invite members with role-based access
- **Subscription Plans** - Free, Starter, Professional, Enterprise tiers
- **Usage Limits** - Configurable limits per plan

### Modern UX
- **Mobile Responsive** - Works on tablets and phones
- **PWA Support** - Installable as a native app with offline capability
- **Keyboard Shortcuts** - Power user productivity features
- **Command Palette** - Quick navigation (Cmd/Ctrl + K)
- **Barcode Scanner** - Camera-based product scanning
- **QR Payments** - UPI QR code generation

### Business Tools
- **Dashboard Analytics** - Sales trends, receivables, insights
- **Food Cost Reports** - Recipe cost vs selling price analysis
- **Reports & Exports** - CSV exports, GST reports
- **Notifications** - In-app alerts for important events
- **Audit Logs** - Track all system activities
- **API Access** - RESTful API with key authentication

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Authentication | NextAuth.js |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| State | React Hooks |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Docker)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd billing-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Push database schema
npm run db:push

# Seed sample data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@billing.local | Admin123! |
| Staff | staff@billing.local | Staff123! |

## Documentation

### Getting Started
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Feature Guide](./docs/FEATURES.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

### Restaurant POS Features
- [Restaurant POS Overview](./docs/RESTAURANT-POS.md) - Complete guide to restaurant features
- [Table Management](./docs/TABLE-MANAGEMENT.md) - Floor plans and table operations
- [Kitchen Display System](./docs/KDS.md) - KOT and kitchen workflow
- [Recipe Management](./docs/RECIPES.md) - BOM and food cost tracking
- [Bill Operations](./docs/BILL-OPERATIONS.md) - Split and merge functionality
- [Offline Mode](./docs/OFFLINE-MODE.md) - PWA and offline capabilities

### Reference
- [Product Roadmap](./docs/ROADMAP.md)

## Project Structure

```
billing-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Sample data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login, registration
│   │   ├── (dashboard)/   # Protected app routes
│   │   │   ├── billing/   # POS interface
│   │   │   ├── tables/    # 🍽️ Table management & floor plan editor
│   │   │   ├── kds/       # 🍽️ Kitchen Display System
│   │   │   ├── recipes/   # 🍽️ Recipe/BOM management
│   │   │   ├── products/  # Product management
│   │   │   ├── invoices/  # Invoice list/details
│   │   │   ├── parties/   # Customers/suppliers
│   │   │   ├── reports/   # Reports & exports
│   │   │   ├── settings/  # Configuration
│   │   │   └── admin/     # Super admin panel
│   │   └── api/           # API routes
│   │       ├── floor-plans/   # 🍽️ Floor plan APIs
│   │       ├── tables/        # 🍽️ Table APIs
│   │       ├── orders/        # 🍽️ Order APIs
│   │       ├── kds/           # 🍽️ KDS APIs
│   │       ├── recipes/       # 🍽️ Recipe APIs
│   │       ├── bills/         # 🍽️ Split/merge APIs
│   │       └── ...
│   ├── components/
│   │   ├── ui/            # shadcn components
│   │   ├── billing/       # POS & split bill components
│   │   ├── tables/        # 🍽️ Table card, floor plan view/editor
│   │   ├── kds/           # 🍽️ KDS display, order ticket
│   │   ├── recipes/       # 🍽️ Recipe form
│   │   ├── offline/       # 🍽️ Offline indicator
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── layout/        # Sidebar, header
│   │   └── ...
│   ├── services/          # Business logic layer
│   │   ├── table.service.ts   # 🍽️ Floor plan & table operations
│   │   ├── order.service.ts   # 🍽️ Order lifecycle
│   │   ├── kds.service.ts     # 🍽️ Kitchen display logic
│   │   ├── recipe.service.ts  # 🍽️ Recipe/BOM management
│   │   ├── bill.service.ts    # 🍽️ Split/merge operations
│   │   ├── offline.service.ts # 🍽️ IndexedDB storage
│   │   └── ...
│   ├── hooks/
│   │   ├── use-offline-mode.ts # 🍽️ Offline status hook
│   │   └── ...
│   ├── lib/               # Utilities, auth, db
│   ├── types/             # TypeScript types
│   └── validations/       # Zod schemas
├── public/
│   ├── icons/             # PWA icons
│   ├── sounds/            # 🍽️ Alert sounds for KDS
│   ├── sw.js              # 🍽️ Service worker for offline
│   └── manifest.json      # PWA manifest
└── docs/                  # Documentation
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/billing_app"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Payment Gateway
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `?` | Show all shortcuts |
| `G then H` | Go to Dashboard |
| `G then B` | Go to Billing |
| `G then T` | Go to Tables |
| `G then K` | Go to Kitchen (KDS) |
| `G then P` | Go to Products |
| `G then I` | Go to Invoices |
| `N then S` | New Sale |
| `N then P` | New Product |
| `F2` | Focus product search (Billing) |
| `F12` | Open payment dialog (Billing) |

## Roadmap

### Completed (v1.0)
- Phases 1-16: Full billing platform with multi-tenancy, POS, invoicing, reports, PWA

### Completed (v2.0) - Restaurant POS
- ✅ Table Management with visual floor plan editor
- ✅ Kitchen Display System (KDS) with order tracking
- ✅ Kitchen Order Tickets (KOT) generation
- ✅ Recipe/BOM Management with food cost analysis
- ✅ Split Bill (by items, percentage, equal)
- ✅ Merge Tables and Bills
- ✅ Enhanced Offline Mode with IndexedDB

### Coming Soon
| Phase | Feature | Priority |
|-------|---------|----------|
| 17 | Bulk Operations (Import/Export) | High |
| 18 | Returns & Credit Notes | High |
| 19 | Email Integration | Medium |
| 20 | Print Templates (Thermal/A4) | Medium |
| 21 | Multi-Currency Support | Medium |
| 22 | Advanced Inventory (Warehouses, Batches) | Medium |
| 23 | Purchase Orders | Medium |
| 24 | Reservation System | Medium |
| 25 | Waiter/Staff App | Low |

See the full [Product Roadmap](./docs/ROADMAP.md) for all planned features.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the maintainers.
