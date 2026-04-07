# Billing App - Multi-Tenant SaaS Billing Platform

A production-grade, multi-tenant billing and POS (Point of Sale) application built for retail businesses. Features complete invoice management, inventory tracking, GST compliance, and team collaboration.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)

## Features

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
- **PWA Support** - Installable as a native app
- **Keyboard Shortcuts** - Power user productivity features
- **Command Palette** - Quick navigation (Cmd/Ctrl + K)
- **Barcode Scanner** - Camera-based product scanning
- **QR Payments** - UPI QR code generation

### Business Tools
- **Dashboard Analytics** - Sales trends, receivables, insights
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

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Feature Guide](./docs/FEATURES.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
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
│   │   │   ├── products/  # Product management
│   │   │   ├── invoices/  # Invoice list/details
│   │   │   ├── parties/   # Customers/suppliers
│   │   │   ├── reports/   # Reports & exports
│   │   │   ├── settings/  # Configuration
│   │   │   └── admin/     # Super admin panel
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── ui/            # shadcn components
│   │   ├── billing/       # POS components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── layout/        # Sidebar, header
│   │   └── ...
│   ├── services/          # Business logic layer
│   ├── lib/               # Utilities, auth, db
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript types
│   └── validations/       # Zod schemas
├── public/
│   ├── icons/             # PWA icons
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
| `G then P` | Go to Products |
| `G then I` | Go to Invoices |
| `N then S` | New Sale |
| `N then P` | New Product |
| `F2` | Focus product search (Billing) |
| `F12` | Open payment dialog (Billing) |

## Roadmap

### Completed (v1.0)
- Phases 1-16: Full billing platform with multi-tenancy, POS, invoicing, reports, PWA, and more

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
