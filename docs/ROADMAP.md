# Product Roadmap

This document outlines the completed phases and planned future enhancements for the Billing App.

## Completed Phases

### Phase 1: Foundation & Authentication
- [x] Next.js 14 App Router setup
- [x] TypeScript configuration
- [x] Tailwind CSS + shadcn/ui integration
- [x] PostgreSQL with Prisma ORM
- [x] NextAuth.js credentials authentication
- [x] Protected route middleware
- [x] User roles (Super Admin, Admin, Member)

### Phase 2: Product Management
- [x] Product CRUD operations
- [x] Category management
- [x] SKU and barcode support
- [x] HSN codes for GST
- [x] Tax rate configuration
- [x] Product search with debouncing
- [x] Bulk product listing with pagination

### Phase 3: Billing Core
- [x] POS-style billing interface
- [x] Product search with autocomplete
- [x] Cart management
- [x] Quantity adjustments
- [x] Discount application (percentage/fixed)
- [x] Tax calculation (CGST/SGST/IGST)
- [x] Multiple payment modes

### Phase 4: Invoice Management
- [x] Invoice creation with atomic transactions
- [x] Invoice numbering with prefixes
- [x] Invoice types (Sale, Purchase, Expense)
- [x] Invoice statuses (Draft, Completed, Cancelled)
- [x] Payment status tracking
- [x] PDF generation
- [x] Shareable invoice links

### Phase 5: Settings & Configuration
- [x] Business profile settings
- [x] Tax configuration
- [x] Invoice templates
- [x] Terms and conditions
- [x] Digital signature upload
- [x] UPI ID for payments

### Phase 6: Dashboard & Analytics
- [x] Today's sales widget
- [x] Monthly sales with growth percentage
- [x] Receivables/Payables summary
- [x] 12-month sales chart
- [x] Low stock alerts widget
- [x] Business insights (AOV, new customers)
- [x] Quick action buttons

### Phase 7: Notifications & Alerts
- [x] In-app notification system
- [x] Notification bell with unread count
- [x] Alert types (low stock, payment due, etc.)
- [x] Mark as read functionality
- [x] Notification history page

### Phase 8: Multi-Tenancy
- [x] Workspace (tenant) creation
- [x] Row-level data isolation
- [x] Workspace switching
- [x] Tenant-scoped queries
- [x] Membership management

### Phase 9: Party Management
- [x] Customer management
- [x] Supplier management
- [x] Balance tracking (receivables/payables)
- [x] Transaction history per party
- [x] GSTIN storage
- [x] Party-wise reports

### Phase 10: Reports & Exports
- [x] Invoice reports
- [x] GST summary reports
- [x] HSN-wise reports
- [x] Product reports
- [x] Party reports
- [x] CSV export functionality
- [x] Date range filtering

### Phase 11: Subscription & Plans
- [x] Plan definitions (Free, Starter, Pro, Enterprise)
- [x] Usage limits (invoices, products, users)
- [x] Plan comparison page
- [x] Razorpay integration
- [x] Subscription management
- [x] Usage tracking widgets

### Phase 12: API Key Management
- [x] API key generation
- [x] Scope-based permissions
- [x] Rate limiting per plan
- [x] API usage statistics
- [x] Key revocation
- [x] REST API endpoints

### Phase 13: Audit Logging
- [x] Activity tracking for all mutations
- [x] User action attribution
- [x] Timestamp logging
- [x] Activity log viewer
- [x] Filter by action type

### Phase 14: Mobile Responsiveness & PWA
- [x] Mobile-first responsive design
- [x] Bottom navigation for mobile
- [x] Slide-out mobile sidebar
- [x] PWA manifest
- [x] Service worker for offline
- [x] Install prompt
- [x] Touch-optimized buttons

### Phase 15: Keyboard Shortcuts
- [x] Global shortcut handler
- [x] Prefix key sequences (G+H, N+S)
- [x] Command palette (Cmd/Ctrl+K)
- [x] Shortcuts help modal (?)
- [x] Billing page shortcuts (F2, F3, F12)
- [x] Navigation shortcuts

### Phase 16: Barcode & QR Code Support
- [x] Camera-based barcode scanner
- [x] EAN, UPC, Code128, Code39 support
- [x] Product lookup by barcode
- [x] UPI QR code generation
- [x] Payment QR dialog
- [x] Haptic feedback on scan

---

## Planned Future Phases

### Phase 17: Bulk Operations
**Priority: High**

Efficient handling of large-scale data operations.

| Feature | Description |
|---------|-------------|
| Bulk Product Import | CSV/Excel import with validation |
| Bulk Product Export | Export all products with filters |
| Bulk Price Update | Update prices by percentage/fixed amount |
| Bulk Stock Adjustment | Adjust stock for multiple products |
| Bulk Category Assignment | Assign categories to multiple products |
| Import Templates | Downloadable CSV templates |
| Import History | Track past imports with status |

**Technical Considerations:**
- Background job processing for large imports
- Progress tracking with WebSocket updates
- Rollback support for failed imports
- Duplicate detection and handling

---

### Phase 18: Returns & Credit Notes
**Priority: High**

Handle product returns and issue credit notes.

| Feature | Description |
|---------|-------------|
| Return Invoice | Create returns against original invoices |
| Credit Notes | Generate credit notes for returns |
| Stock Reversal | Automatic stock increment on returns |
| Partial Returns | Return specific items from an invoice |
| Return Reasons | Track why items were returned |
| Return Reports | Analytics on return patterns |

**Database Changes:**
```prisma
model Return {
  id              String   @id @default(cuid())
  returnNumber    String   @unique
  originalInvoiceId String
  originalInvoice Invoice  @relation(fields: [originalInvoiceId], references: [id])
  reason          String?
  status          ReturnStatus
  refundAmount    Decimal
  items           ReturnItem[]
  createdAt       DateTime @default(now())
}

model ReturnItem {
  id           String  @id @default(cuid())
  returnId     String
  return       Return  @relation(fields: [returnId], references: [id])
  productId    String
  quantity     Int
  unitPrice    Decimal
}
```

---

### Phase 19: Email Integration
**Priority: Medium**

Send invoices and notifications via email.

| Feature | Description |
|---------|-------------|
| Invoice Email | Send PDF invoices to customers |
| Payment Reminders | Automated due date reminders |
| Low Stock Alerts | Email alerts for low inventory |
| Welcome Emails | New user onboarding |
| Email Templates | Customizable email templates |
| Email Logs | Track sent emails |

**Integration Options:**
- Resend (recommended for Next.js)
- SendGrid
- AWS SES
- Nodemailer with SMTP

---

### Phase 20: Print Templates
**Priority: Medium**

Customizable invoice and receipt printing.

| Feature | Description |
|---------|-------------|
| A4 Invoice | Full-page invoice template |
| Thermal Receipt | 80mm thermal printer support |
| A5 Invoice | Half-page compact invoice |
| Custom Branding | Logo, colors, fonts |
| Template Editor | Visual template customization |
| Print Preview | Preview before printing |

**Technical Approach:**
- React-to-PDF for invoice generation
- ESC/POS commands for thermal printers
- Handlebars templates for customization

---

### Phase 21: Multi-Currency Support
**Priority: Medium**

Support for international transactions.

| Feature | Description |
|---------|-------------|
| Currency Selection | Configure default currency |
| Exchange Rates | Manual/automatic rate updates |
| Multi-currency Invoices | Create invoices in any currency |
| Currency Conversion | Convert between currencies |
| Currency Reports | Reports with currency breakdown |

---

### Phase 22: Advanced Inventory
**Priority: Medium**

Enhanced inventory management features.

| Feature | Description |
|---------|-------------|
| Multiple Warehouses | Track stock across locations |
| Stock Transfers | Move stock between warehouses |
| Batch/Lot Tracking | Track products by batch number |
| Expiry Date Tracking | Alert for expiring products |
| Serial Number Tracking | Track individual units |
| Inventory Valuation | FIFO, LIFO, Weighted Average |
| Stock Take | Physical inventory counting |

---

### Phase 23: Purchase Orders
**Priority: Medium**

Formalize supplier ordering process.

| Feature | Description |
|---------|-------------|
| PO Creation | Create purchase orders |
| PO Approval | Approval workflow |
| PO to Invoice | Convert PO to purchase invoice |
| Supplier Catalogs | Import supplier product lists |
| Reorder Points | Automatic PO suggestions |
| PO Tracking | Track order status |

---

### Phase 24: Customer Portal
**Priority: Low**

Self-service portal for customers.

| Feature | Description |
|---------|-------------|
| Invoice Access | View and download invoices |
| Payment History | See all payments |
| Online Payments | Pay invoices online |
| Order History | View past orders |
| Account Statement | Download account statements |
| Support Tickets | Submit support requests |

---

### Phase 25: Advanced Analytics
**Priority: Low**

Deep business intelligence features.

| Feature | Description |
|---------|-------------|
| Sales Forecasting | Predict future sales |
| Inventory Forecasting | Predict stock needs |
| Customer Segmentation | RFM analysis |
| Product Performance | Best/worst sellers |
| Profit Margins | Margin analysis by product |
| Custom Dashboards | Build custom dashboards |
| Scheduled Reports | Auto-email reports |

---

### Phase 26: Integrations
**Priority: Low**

Third-party service integrations.

| Feature | Description |
|---------|-------------|
| Tally Export | Export to Tally format |
| QuickBooks | Sync with QuickBooks |
| Zoho Books | Sync with Zoho |
| Shopify | Sync products and orders |
| WooCommerce | Sync with WooCommerce |
| WhatsApp | Send invoices via WhatsApp |
| Zapier | Connect with 5000+ apps |

---

### Phase 27: E-way Bill Integration
**Priority: Low (India-specific)**

GST e-way bill generation.

| Feature | Description |
|---------|-------------|
| E-way Bill Generation | Generate from invoices |
| Vehicle Details | Capture transport info |
| E-way Bill Validation | Verify bill status |
| Bulk Generation | Generate multiple bills |
| API Integration | Direct NIC API integration |

---

### Phase 28: Mobile App
**Priority: Low**

Native mobile application.

| Feature | Description |
|---------|-------------|
| React Native App | iOS and Android |
| Offline Mode | Work without internet |
| Sync Engine | Background data sync |
| Push Notifications | Real-time alerts |
| Camera Integration | Native barcode scanning |
| Biometric Auth | Fingerprint/Face ID login |

---

## Implementation Priority Matrix

| Priority | Phases | Timeline |
|----------|--------|----------|
| **High** | 17 (Bulk Ops), 18 (Returns) | Next 2-3 months |
| **Medium** | 19-23 (Email, Print, Currency, Inventory, PO) | 3-6 months |
| **Low** | 24-28 (Portal, Analytics, Integrations, E-way, Mobile) | 6-12 months |

---

## How to Contribute

Interested in contributing to a specific phase? Here's how:

1. Check the [GitHub Issues](https://github.com/your-repo/issues) for related tasks
2. Comment on the issue to express interest
3. Fork the repository and create a feature branch
4. Follow the [Development Guide](./DEVELOPMENT.md)
5. Submit a Pull Request

---

## Requesting Features

Have an idea for a new phase or feature?

1. Open a [GitHub Issue](https://github.com/your-repo/issues/new)
2. Use the "Feature Request" template
3. Describe the use case and expected behavior
4. Community voting helps prioritize features

---

## Version History

| Version | Date | Phases Completed |
|---------|------|------------------|
| 1.0.0 | TBD | Phases 1-16 (MVP) |
| 1.1.0 | TBD | Phase 17 (Bulk Operations) |
| 1.2.0 | TBD | Phase 18 (Returns & Credit Notes) |
| 2.0.0 | TBD | Phases 19-23 |
