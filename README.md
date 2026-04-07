# Billing App - Production POS & Invoice Management

A production-grade billing/POS application for retail businesses built with Next.js 14, featuring product management, inventory tracking, and invoice generation with GST calculations.

## Features

- **Multi-role Authentication** - Admin and Staff roles with NextAuth.js
- **Product Management** - Full CRUD with categories, HSN codes, and GST rates
- **Inventory Tracking** - Real-time stock management with low-stock alerts
- **POS Billing Interface** - Fast product search, cart management, payment processing
- **Invoice Generation** - GST-compliant invoices with CGST/SGST/IGST split
- **Party Management** - Customer and supplier tracking with balance management
- **Dashboard** - Vyapar-style analytics with sales, receivables, and payables
- **Settings** - Configurable business info, tax rates, and invoice preferences
- **Mobile Responsive** - Optimized for tablets and mobile devices
- **PWA Support** - Installable as a Progressive Web App with offline capabilities

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) or a PostgreSQL instance
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd billing-app
npm install
```

### 2. Start Database

Using Docker:
```bash
docker compose up -d
```

Or configure your own PostgreSQL and update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/billing_app"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@billing.local | Admin123! |
| Staff | staff@billing.local | Staff123! |

## Project Structure

```
billing-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Sample data
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login pages
│   │   ├── (dashboard)/   # Protected routes
│   │   │   ├── billing/   # POS interface
│   │   │   ├── products/  # Product management
│   │   │   ├── invoices/  # Invoice list/details
│   │   │   ├── parties/   # Customer/supplier
│   │   │   └── settings/  # Configuration
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── ui/            # shadcn components
│   │   ├── billing/       # POS components
│   │   ├── products/      # Product components
│   │   └── layout/        # Sidebar, header
│   ├── lib/
│   │   ├── db.ts          # Prisma client
│   │   ├── auth.ts        # NextAuth config
│   │   └── utils.ts       # Utilities
│   ├── services/          # Business logic
│   └── validations/       # Zod schemas
├── docker-compose.yml
└── .env
```

## Key Features

### Atomic Stock Management

Stock is decremented atomically during invoice creation using Prisma transactions with serializable isolation to prevent overselling.

### Invoice Immutability

Invoice items store product snapshots (name, SKU, price) at creation time. Changes to product prices don't affect existing invoices.

### GST Calculations

Automatic CGST/SGST split for intrastate sales, IGST for interstate. Configurable per-product or default rates.

### Progressive Web App (PWA)

The app can be installed on mobile devices and desktops:
- Install prompt appears after 30 seconds of use
- Offline caching with service worker
- App shortcuts for quick access to Sale, Invoices, and Products
- Safe area support for notched devices

### Keyboard Shortcuts

Power user features for faster operation:
- **Cmd/Ctrl + K** - Open command palette
- **?** - Show all keyboard shortcuts
- **G then H/B/P/I/A/R/S** - Navigate to different sections
- **N then S/P/A** - Create new Sale/Product/Party
- **F2/F3/F12** - Billing page quick actions
- **/** - Focus search input

### Barcode & QR Code Support

- **Barcode Scanner** - Scan product barcodes using device camera for quick product lookup
- **UPI QR Code** - Generate UPI payment QR codes for customer payments
- **Product Barcodes** - Store and search products by barcode/EAN/UPC codes

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
```

## License

MIT
