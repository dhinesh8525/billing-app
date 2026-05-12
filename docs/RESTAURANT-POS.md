# Restaurant POS Overview

Complete guide to the restaurant-specific features in the Billing App. This documentation covers all Petpooja-like functionality for managing dine-in operations, kitchen workflow, and advanced billing.

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Feature Documentation](#feature-documentation)
5. [Workflow Examples](#workflow-examples)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Feature Overview

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Table Management** | Visual floor plan editor, table status tracking | [TABLE-MANAGEMENT.md](./TABLE-MANAGEMENT.md) |
| **Kitchen Display System** | Real-time order display for kitchen staff | [KDS.md](./KDS.md) |
| **Recipe Management** | Ingredient tracking and food cost analysis | [RECIPES.md](./RECIPES.md) |
| **Bill Operations** | Split bills and merge tables | [BILL-OPERATIONS.md](./BILL-OPERATIONS.md) |
| **Offline Mode** | Continue operations during network outages | [OFFLINE-MODE.md](./OFFLINE-MODE.md) |

---

## Quick Start

### 1. Set Up Your First Floor Plan

```bash
# Navigate to Tables section
Go to: Dashboard → Tables → Edit Layout
```

1. Create a new floor plan (e.g., "Main Floor", "Patio")
2. Add tables with capacity and shape
3. Drag tables to position them visually
4. Save the layout

### 2. Start Taking Orders

```bash
# From the floor plan view
Click any AVAILABLE table → Add items → Send to Kitchen
```

1. Click on a table to open the order form
2. Add menu items (products) to the order
3. Items automatically generate KOT (Kitchen Order Ticket)
4. Kitchen sees order in KDS (Kitchen Display System)

### 3. Kitchen Workflow

```bash
# Kitchen staff opens KDS
Go to: Dashboard → Kitchen (KDS)
```

1. Orders appear as cards with item lists
2. Mark items as "Preparing" when started
3. Mark items as "Ready" when completed
4. Entire order becomes ready when all items done

### 4. Complete the Sale

```bash
# Convert order to invoice for payment
Click "Bill" on the table → Process payment
```

1. Review order items and totals
2. Apply discounts if needed
3. Process payment (Cash/Card/UPI)
4. Table becomes available again

---

## Architecture

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Floor Plan    │────▶│     Tables      │────▶│     Orders      │
│   (Layout)      │     │   (Status)      │     │   (Items)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Invoice      │◀────│   KOT Receipt   │◀────│  Order Items    │
│   (Payment)     │     │   (Kitchen)     │     │  (per Station)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Database Models

```
FloorPlan (1) ──▶ (N) Table
Table (1) ──▶ (N) Order
Order (1) ──▶ (N) OrderItem
Order (1) ──▶ (N) KOTReceipt
Order (1) ──▶ (0..1) Invoice
Product (1) ──▶ (0..1) Recipe
Recipe (1) ──▶ (N) RecipeIngredient
Invoice (1) ──▶ (N) BillTransaction
```

### Service Layer

| Service | Responsibility |
|---------|----------------|
| `TableService` | Floor plan CRUD, table status management |
| `OrderService` | Order lifecycle, KOT generation, order→invoice |
| `KDSService` | Kitchen display config, pending orders, item status |
| `RecipeService` | Recipe CRUD, cost calculation, raw material deduction |
| `BillService` | Split/merge operations, bill history |
| `OfflineService` | IndexedDB storage, sync queue management |

---

## Feature Documentation

### Table Management
Create visual floor plans with drag-drop positioning. Track table status in real-time.

👉 **[Full Documentation](./TABLE-MANAGEMENT.md)**

Key concepts:
- Floor Plans: Named layouts (Main Floor, Patio, Private Room)
- Tables: Numbered with capacity, shape, and position
- Statuses: AVAILABLE → OCCUPIED → BILLING → CLEANING

### Kitchen Display System (KDS)
Full-screen kitchen view with order cards and sound alerts.

👉 **[Full Documentation](./KDS.md)**

Key concepts:
- KOT (Kitchen Order Ticket): Printed/displayed for kitchen
- Stations: KITCHEN, BAR, GRILL, etc.
- Auto-refresh: 5-second polling for new orders

### Recipe Management
Track ingredients and calculate food costs accurately.

👉 **[Full Documentation](./RECIPES.md)**

Key concepts:
- Recipe: Links a product to its ingredients
- BOM (Bill of Materials): Ingredient list with quantities
- Food Cost %: Cost / Selling Price × 100

### Bill Operations
Split bills and merge tables for flexible payment handling.

👉 **[Full Documentation](./BILL-OPERATIONS.md)**

Key concepts:
- Split by Items: Each person pays for specific items
- Split by Percentage: Custom % splits (60/40, etc.)
- Split Equally: Divide total by N people
- Merge Tables: Combine orders from multiple tables

### Offline Mode
Continue operations during network outages with automatic sync.

👉 **[Full Documentation](./OFFLINE-MODE.md)**

Key concepts:
- IndexedDB: Local storage for products and orders
- Sync Queue: Pending operations to sync when online
- Service Worker: Cache static assets for offline access

---

## Workflow Examples

### Scenario 1: Busy Dinner Service

```
1. Guest arrives → Assign to Table T5 (4-seater)
2. Take order → 2 Starters, 3 Mains, 1 Dessert
3. KOT prints in Kitchen station
4. Kitchen marks items ready as they're prepared
5. Waiter serves items (status: SERVED)
6. Guest requests bill split by items
7. Generate 2 separate invoices
8. Process payments
9. Table T5 → CLEANING → AVAILABLE
```

### Scenario 2: Group Dining with Merge

```
1. Large group needs 2 tables → T1 and T2
2. Take separate orders for each table
3. Later, group wants combined bill
4. Merge tables T1 + T2
5. Single invoice generated
6. Process one payment
7. Both tables freed
```

### Scenario 3: Network Outage

```
1. Internet goes down
2. App shows "Offline" indicator
3. Continue taking orders (stored in IndexedDB)
4. Orders queued for sync
5. Internet returns
6. Auto-sync uploads pending orders
7. KDS receives orders, kitchen starts prep
```

---

## API Reference

### Tables & Floor Plans

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/floor-plans` | GET | List floor plans |
| `/api/floor-plans` | POST | Create floor plan |
| `/api/floor-plans/[id]` | GET | Get floor plan with tables |
| `/api/tables` | GET | List tables (filter by floorPlanId) |
| `/api/tables` | POST | Create table |
| `/api/tables/[id]/status` | PATCH | Update table status |

### Orders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | GET | List orders |
| `/api/orders` | POST | Create order |
| `/api/orders/[id]` | GET | Get order details |
| `/api/orders/[id]/items` | POST | Add items to order |
| `/api/orders/[id]/convert` | POST | Convert to invoice |

### KDS

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/kds/orders` | GET | Get pending orders for KDS |
| `/api/kds/orders/[id]/items/[itemId]` | PATCH | Update item status |
| `/api/kds/config` | GET/PUT | KDS configuration |

### Bills

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bills/[id]/split` | POST | Split a bill |
| `/api/bills/merge` | POST | Merge multiple bills |
| `/api/bills/[id]/history` | GET | Get bill transaction history |

---

## Troubleshooting

### Table shows wrong status
- Refresh the floor plan view
- Check if there are pending orders on the table
- Use table status API to manually correct if needed

### KDS not showing orders
- Verify orders have status CONFIRMED or PREPARING
- Check station filter matches order items
- Ensure polling is active (check network tab)

### Split bill totals don't match
- Review each split invoice for rounding
- Check bill transaction history for audit trail
- Contact support if discrepancy persists

### Offline mode not working
- Ensure service worker is registered
- Check IndexedDB storage in DevTools
- Clear cache and reload if issues persist

---

## Related Documentation

- [API Documentation](./API.md) - Full API reference
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Development Guide](./DEVELOPMENT.md) - Local setup
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
