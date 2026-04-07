# Feature Guide

Complete documentation of all features in the Billing App.

## Table of Contents

1. [Authentication & Users](#authentication--users)
2. [Multi-Tenancy & Workspaces](#multi-tenancy--workspaces)
3. [Product Management](#product-management)
4. [Billing & POS](#billing--pos)
5. [Invoice Management](#invoice-management)
6. [Party Management](#party-management)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [Reports & Exports](#reports--exports)
9. [Notifications & Alerts](#notifications--alerts)
10. [Settings & Configuration](#settings--configuration)
11. [Subscription & Plans](#subscription--plans)
12. [API Access](#api-access)
13. [Mobile & PWA](#mobile--pwa)
14. [Keyboard Shortcuts](#keyboard-shortcuts)
15. [Barcode & QR Codes](#barcode--qr-codes)

---

## Authentication & Users

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| SUPER_ADMIN | Platform administrator | All permissions, manage all tenants |
| ADMIN | Workspace administrator | Full workspace access, manage team |
| MEMBER | Team member | Limited access based on settings |

### Login Flow
1. Navigate to `/login`
2. Enter email and password
3. On success, redirected to dashboard
4. Session persists via JWT token

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

---

## Multi-Tenancy & Workspaces

### Workspace Isolation
- Each workspace (tenant) has completely isolated data
- Users can belong to multiple workspaces
- Switch between workspaces via header dropdown

### Team Management
- **Invite Members**: Settings > Team > Invite
- **Role Assignment**: Admin or Member roles
- **Remove Members**: Revoke access instantly

### Creating a Workspace
1. Go to Settings > Workspace
2. Click "Create New Workspace"
3. Enter workspace name
4. Invite team members

---

## Product Management

### Product Fields

| Field | Description | Required |
|-------|-------------|----------|
| Name | Product name | Yes |
| SKU | Stock keeping unit (unique) | Yes |
| Barcode | EAN/UPC barcode | No |
| Price | Selling price | Yes |
| Cost Price | Purchase cost | No |
| Stock | Current quantity | Yes |
| Min Stock | Low stock threshold | No |
| Unit | Unit of measure (pcs, kg, etc.) | Yes |
| HSN | HSN/SAC code for GST | No |
| Tax Rate | GST percentage | No |
| Category | Product category | No |

### Stock Management
- **Real-time tracking**: Stock updates on every sale/purchase
- **Low stock alerts**: Notifications when stock falls below minimum
- **Stock value**: Total inventory value on dashboard

### Categories
- Organize products into categories
- Filter products by category
- Category-wise reports

---

## Billing & POS

### Creating a Sale

1. **Navigate**: Go to Billing page (`/billing` or press `G B`)
2. **Search Products**: Type product name/SKU or scan barcode
3. **Add to Cart**: Click product or press Enter
4. **Adjust Quantity**: Use +/- buttons or type quantity
5. **Customer Info**: Optionally add customer name/phone
6. **Apply Discount**: Select percentage or enter custom
7. **Payment**: Click Pay or press F12
8. **Confirm**: Select payment mode and confirm

### Payment Modes
- Cash
- UPI
- Card
- Bank Transfer
- Credit (on account)

### Barcode Scanning
- Click barcode icon next to search
- Allow camera access
- Point at product barcode
- Product auto-adds to cart

### UPI QR Payment
- Click QR icon next to Pay button
- Shows UPI QR code with amount
- Customer scans to pay

---

## Invoice Management

### Invoice Types
- **SALE**: Sales to customers
- **PURCHASE**: Purchases from suppliers
- **EXPENSE**: Business expenses

### Invoice Statuses
- **DRAFT**: Not yet finalized
- **COMPLETED**: Finalized and locked
- **CANCELLED**: Voided invoice

### Payment Statuses
- **unpaid**: Full amount pending
- **partial**: Partially paid
- **paid**: Fully paid

### Invoice Features
- **PDF Generation**: Download/print invoices
- **Share Link**: Public link for customers
- **Payment Recording**: Record partial/full payments
- **GST Calculation**: Automatic CGST/SGST/IGST split

### Invoice Numbering
- Configurable prefixes (INV, PUR, EXP)
- Auto-incrementing numbers
- Financial year support

---

## Party Management

### Party Types
- **Customer**: People/businesses you sell to
- **Supplier**: People/businesses you buy from
- **Both**: Acts as both customer and supplier

### Party Fields
| Field | Description |
|-------|-------------|
| Name | Party name |
| Type | Customer/Supplier/Both |
| Phone | Contact number |
| Email | Email address |
| GSTIN | GST number |
| Address | Full address |
| Opening Balance | Starting balance |

### Balance Tracking
- **Receivables**: Money customers owe you (positive)
- **Payables**: Money you owe suppliers (negative)
- Auto-updates on invoices and payments

---

## Dashboard & Analytics

### Dashboard Widgets

#### Top Stats Row
- Today's Sales
- This Month Sales (with growth %)
- Receivables (You'll Receive)
- Payables (You'll Pay)

#### Sales Chart
- 12-month sales trend
- Visual bar chart
- Click for details

#### Stock Inventory
- Total stock value
- Low stock items list
- Quick links to products

#### Business Insights
- Sales growth percentage
- Transaction count
- Average order value
- New customers

#### Quick Actions
- New Sale
- Add Item
- Add Party
- View Invoices

#### Payment Due
- Overdue invoices
- Upcoming due dates
- Quick payment links

#### Usage Widget
- Plan usage meters
- Invoice/Product/User limits
- Upgrade prompts

---

## Reports & Exports

### Available Reports

| Report | Description | Export Format |
|--------|-------------|---------------|
| All Invoices | Complete invoice listing | CSV |
| Invoice Items | Line item details | CSV |
| GST Summary | CGST/SGST/IGST breakdown | CSV |
| HSN Summary | HSN-wise tax summary | CSV |
| Products | Product listing with stock | CSV |
| Parties | Customer/supplier list | CSV |

### Date Filtering
- Select date range for reports
- Preset options: Today, This Week, This Month, etc.
- Custom date range

### Analytics Dashboard
- Located at `/reports/analytics`
- Visual charts and graphs
- Period comparisons

---

## Notifications & Alerts

### Alert Types

| Type | Description | Priority |
|------|-------------|----------|
| LOW_STOCK | Product below minimum | Normal |
| OUT_OF_STOCK | Product at zero | High |
| PAYMENT_DUE | Invoice due soon | Normal |
| PAYMENT_OVERDUE | Invoice past due | Urgent |
| INVOICE_CREATED | New invoice generated | Low |
| SUBSCRIPTION_EXPIRING | Plan about to expire | High |
| USAGE_LIMIT_WARNING | Approaching plan limits | High |
| NEW_MEMBER | Team member joined | Low |

### Notification Bell
- Located in header
- Shows unread count
- Click to view recent notifications
- Mark as read individually or all

### Notifications Page
- Full notification history
- Filter by read/unread
- Delete old notifications

---

## Settings & Configuration

### Business Settings
- Business name and logo
- GSTIN, PAN
- Address and contact info
- UPI ID for payments
- Digital signature

### Tax Settings
- Default tax rate
- GST type (Regular/Composition)
- State code for IGST

### Invoice Settings
- Invoice number prefixes
- Terms and conditions
- Thank you message
- Print format (A4/Thermal)
- Show/hide fields

### Team Settings
- View team members
- Invite new members
- Manage roles
- Remove members

### API Keys
- Generate API keys
- Set permissions/scopes
- View usage statistics
- Revoke keys

### Activity Log
- View all system activities
- Filter by user/action
- Export audit logs

---

## Subscription & Plans

### Available Plans

| Plan | Price | Invoices | Products | Users |
|------|-------|----------|----------|-------|
| Free | ₹0/mo | 50/mo | 25 | 1 |
| Starter | ₹499/mo | 500/mo | 100 | 3 |
| Professional | ₹999/mo | Unlimited | 500 | 10 |
| Enterprise | ₹2499/mo | Unlimited | Unlimited | Unlimited |

### Plan Features
- Higher limits on invoices, products, users
- Priority support on paid plans
- API access on Professional+
- Custom branding on Enterprise

### Upgrading
1. Go to Subscription page
2. Select desired plan
3. Complete payment via Razorpay
4. Plan activates immediately

---

## API Access

### Authentication
```bash
curl -H "X-API-Key: your-api-key" \
     https://your-domain.com/api/v1/products
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/products | List products |
| GET | /api/v1/products/:id | Get product |
| POST | /api/v1/products | Create product |
| PUT | /api/v1/products/:id | Update product |
| DELETE | /api/v1/products/:id | Delete product |
| GET | /api/v1/invoices | List invoices |
| GET | /api/v1/invoices/:id | Get invoice |
| POST | /api/v1/invoices | Create invoice |
| GET | /api/v1/parties | List parties |

### Rate Limits
- Free: 100 requests/day
- Starter: 1,000 requests/day
- Professional: 10,000 requests/day
- Enterprise: Unlimited

---

## Mobile & PWA

### Progressive Web App
- **Install**: Click "Add to Home Screen" prompt
- **Offline**: Basic offline support
- **Push Notifications**: Coming soon

### Mobile Navigation
- Bottom navigation bar on mobile
- Hamburger menu for full navigation
- Touch-optimized buttons

### Responsive Design
- Works on phones, tablets, desktops
- Adaptive layouts
- Touch-friendly inputs

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `?` | Show keyboard shortcuts |
| `/` | Focus search |

### Navigation (G prefix)

| Shortcut | Action |
|----------|--------|
| `G H` | Go to Dashboard (Home) |
| `G B` | Go to Billing |
| `G P` | Go to Products |
| `G I` | Go to Invoices |
| `G A` | Go to Parties |
| `G R` | Go to Reports |
| `G S` | Go to Settings |

### Create New (N prefix)

| Shortcut | Action |
|----------|--------|
| `N S` | New Sale |
| `N P` | New Product |
| `N A` | New Party |

### Billing Page

| Shortcut | Action |
|----------|--------|
| `F2` | Focus product search |
| `F3` | Focus customer name |
| `F12` | Open payment dialog |
| `Esc` | Close dialog |

---

## Barcode & QR Codes

### Barcode Scanning
1. On Billing page, click barcode icon
2. Allow camera access when prompted
3. Point camera at product barcode
4. Product auto-adds to cart
5. Supports EAN, UPC, Code128, Code39

### Product Barcodes
- Add barcode to product details
- Search by barcode in billing
- Unique per workspace

### UPI QR Codes
- Auto-generated for payments
- Contains: UPI ID, amount, invoice reference
- Customer scans with any UPI app
- Requires UPI ID in settings

### Invoice QR Codes
- Shareable invoice links
- Scan to view invoice online
- Included in PDF exports
