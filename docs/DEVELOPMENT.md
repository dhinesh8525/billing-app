# Development Guide

This guide covers setting up and developing the Billing App locally.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- **PostgreSQL** 14+ (or Docker)
- **Git**

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd billing-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database - Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/billing_app"

# Or use Docker (see below)
DATABASE_URL="postgresql://billing:billing_secret@localhost:5432/billing_app"

# Authentication
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Razorpay (for payments)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker compose up -d

# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed
```

#### Option B: Local PostgreSQL

```bash
# Create database
createdb billing_app

# Push schema
npm run db:push

# Seed data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
billing-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed script
│   └── migrations/        # Migration files
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Auth routes (login)
│   │   ├── (dashboard)/   # Protected routes
│   │   ├── api/           # API routes
│   │   ├── layout.tsx     # Root layout
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── billing/       # Billing components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── layout/        # Layout components
│   │   ├── notifications/ # Notification components
│   │   ├── barcode/       # Barcode scanner
│   │   ├── qrcode/        # QR code components
│   │   └── command-palette/
│   ├── services/          # Business logic
│   ├── lib/               # Utilities
│   │   ├── db.ts          # Prisma client
│   │   ├── auth.ts        # NextAuth config
│   │   ├── utils.ts       # Helper functions
│   │   └── api-utils-tenant.ts
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript types
│   ├── validations/       # Zod schemas
│   └── providers/         # React providers
├── public/
│   ├── icons/             # PWA icons
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

---

## Code Conventions

### File Naming

- **Components**: PascalCase (`ProductSearch.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Routes**: kebab-case (`/api/api-keys/route.ts`)

### Component Structure

```typescript
"use client" // Only if needed

/**
 * Component description
 *
 * Brief explanation of what this component does.
 */

import { ... } from "..."

interface ComponentProps {
  // Props definition
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState()

  // Effects
  useEffect(() => {}, [])

  // Handlers
  const handleClick = () => {}

  // Render
  return (
    <div>
      ...
    </div>
  )
}
```

### Service Layer Pattern

```typescript
// services/example.service.ts
import { prisma } from "@/lib/db"

export class ExampleService {
  /**
   * Method description
   */
  static async methodName(tenantId: string, data: InputType) {
    // Always include tenantId in queries
    return prisma.model.findMany({
      where: { tenantId, ...conditions }
    })
  }
}
```

### API Route Pattern

```typescript
// app/api/example/route.ts
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { ExampleService } from "@/services"
import { apiResponse, handleApiError, requireTenant } from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const data = await ExampleService.list(tenantId)

    return apiResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Database

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Push changes: `npm run db:push`
3. Or create migration: `npx prisma migrate dev --name change_description`

### Useful Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema (development)
npm run db:push

# Create migration (production)
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npm run db:studio

# Reset database
npx prisma migrate reset
```

### Seeding

Edit `prisma/seed.ts` to modify seed data:

```bash
npm run db:seed
```

---

## Adding New Features

### 1. Adding a New Page

```bash
# Create page file
touch src/app/(dashboard)/new-feature/page.tsx
```

```typescript
// src/app/(dashboard)/new-feature/page.tsx
export default async function NewFeaturePage() {
  return (
    <div>
      <h1>New Feature</h1>
    </div>
  )
}
```

### 2. Adding a New API Route

```bash
touch src/app/api/new-feature/route.ts
```

```typescript
// src/app/api/new-feature/route.ts
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { apiResponse, handleApiError, requireTenant } from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    // Implementation
    return apiResponse({ message: "Success" })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 3. Adding a New Service

```bash
touch src/services/new-feature.service.ts
```

```typescript
// src/services/new-feature.service.ts
import { prisma } from "@/lib/db"

export class NewFeatureService {
  static async list(tenantId: string) {
    return prisma.model.findMany({
      where: { tenantId }
    })
  }
}
```

Export from index:
```typescript
// src/services/index.ts
export { NewFeatureService } from "./new-feature.service"
```

### 4. Adding a New Component

```bash
mkdir -p src/components/new-feature
touch src/components/new-feature/component-name.tsx
```

### 5. Adding shadcn/ui Components

```bash
npx shadcn@latest add component-name
```

---

## Testing

### Manual Testing

1. Test in different browsers
2. Test responsive design
3. Test keyboard navigation
4. Test with screen readers

### Type Checking

```bash
npm run lint        # ESLint
npx tsc --noEmit   # TypeScript
```

---

## Debugging

### Server-Side

```typescript
console.log("Debug:", variable)
// Check terminal output
```

### Client-Side

```typescript
console.log("Debug:", variable)
// Check browser DevTools
```

### Database Queries

```typescript
// Enable Prisma query logging
// In prisma client:
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

### Prisma Studio

```bash
npm run db:studio
```

---

## Common Tasks

### Updating Dependencies

```bash
# Update all
npm update

# Update specific
npm update package-name

# Check outdated
npm outdated
```

### Building for Production

```bash
npm run build
npm start
```

### Checking Bundle Size

```bash
npm run build
# Check .next/analyze if configured
```

---

## Troubleshooting

### Prisma Issues

```bash
# Regenerate client
npx prisma generate

# Reset database
npx prisma migrate reset

# Check connection
npx prisma db pull
```

### Next.js Issues

```bash
# Clear cache
rm -rf .next
npm run dev
```

### Node Modules Issues

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Git Workflow

### Branch Naming

- `feature/feature-name`
- `fix/bug-description`
- `chore/task-description`

### Commit Messages

```
type(scope): description

feat(billing): add barcode scanner
fix(invoice): correct tax calculation
chore(deps): update dependencies
```

### Pull Requests

1. Create feature branch
2. Make changes
3. Run lint and type check
4. Test thoroughly
5. Create PR with description
6. Request review
