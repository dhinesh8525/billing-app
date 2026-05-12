# Kitchen Display System (KDS)

Complete guide to the Kitchen Display System and Kitchen Order Tickets (KOT) functionality.

## Table of Contents

1. [Overview](#overview)
2. [KOT (Kitchen Order Tickets)](#kot-kitchen-order-tickets)
3. [KDS Interface](#kds-interface)
4. [Order Item Workflow](#order-item-workflow)
5. [Stations](#stations)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)

---

## Overview

The Kitchen Display System (KDS) replaces paper tickets with a real-time digital display that shows orders to kitchen staff. When orders are placed, they automatically appear on the KDS for preparation.

### Key Features

- **Real-time Updates**: Orders appear within seconds of being placed
- **Station Filtering**: View orders for specific stations (Kitchen, Bar, Grill)
- **Item Status Tracking**: Mark individual items as Preparing → Ready
- **Sound Alerts**: Audio notification for new orders
- **Full-screen Mode**: Optimized for kitchen display monitors
- **Timer Display**: Shows how long orders have been waiting

---

## KOT (Kitchen Order Tickets)

### What is a KOT?

A KOT (Kitchen Order Ticket) is a record of items that need to be prepared. When an order is created, KOTs are automatically generated and grouped by station.

### KOT Generation

```
Order Created (5 items)
    │
    ├── KOT-240513-001 (KITCHEN)
    │   ├── Butter Chicken
    │   ├── Dal Makhani
    │   └── Naan (3)
    │
    └── KOT-240513-002 (BAR)
        ├── Mojito
        └── Fresh Lime Soda
```

### KOT Properties

| Property | Type | Description |
|----------|------|-------------|
| `kotNumber` | string | Unique number (KOT-YYMMDD-NNN) |
| `orderId` | string | Parent order reference |
| `station` | string | Target station (KITCHEN, BAR, etc.) |
| `printCount` | number | Number of times printed |
| `printedAt` | datetime | First print timestamp |
| `completedAt` | datetime | When all items marked ready |

### KOT Numbering

Format: `KOT-YYMMDD-NNN`

Example: `KOT-240513-042` = 42nd KOT on May 13, 2024

Numbers reset daily at midnight.

---

## KDS Interface

### Accessing KDS

Navigate to: **Dashboard → Kitchen (KDS)**

Or use keyboard shortcut: `G then K`

### Interface Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Station: [ALL ▼]  [⚙️ Settings]  [↻ Refresh]  [🔊 Sound ON] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│ │ T5       │  │ T3       │  │ TAKEAWAY │  │ T8       │     │
│ │ ORD-042  │  │ ORD-041  │  │ ORD-040  │  │ ORD-039  │     │
│ │ 2:34     │  │ 5:12     │  │ 8:45     │  │ 12:30    │     │
│ ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤     │
│ │□ Chicken │  │■ Paneer  │  │■ Biryani │  │✓ Naan    │     │
│ │□ Rice    │  │□ Roti    │  │■ Raita   │  │✓ Dal     │     │
│ │□ Salad   │  │          │  │          │  │[READY]   │     │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘

Legend: □ Pending  ■ Preparing  ✓ Ready
```

### Order Card Components

Each order displays as a card with:

- **Header**: Table number (or TAKEAWAY/DELIVERY), order number
- **Timer**: Minutes:seconds since order created
- **Items**: List with checkboxes for status
- **Action Button**: "Mark All Ready" when all items complete

### Color Coding

| Time | Color | Meaning |
|------|-------|---------|
| 0-5 min | Green | Fresh order, normal |
| 5-10 min | Yellow | Getting older, prioritize |
| 10+ min | Red | Urgent, needs immediate attention |

---

## Order Item Workflow

### Item Statuses

```
PENDING → PREPARING → READY → SERVED
```

| Status | Icon | Description |
|--------|------|-------------|
| **PENDING** | ☐ | Newly received, not started |
| **PREPARING** | ■ | Being cooked/prepared |
| **READY** | ✓ | Finished, ready to serve |
| **SERVED** | (hidden) | Delivered to customer |

### Updating Item Status

**Single Item:**
1. Click on the item checkbox
2. Status cycles: PENDING → PREPARING → READY

**All Items:**
1. Click "Mark All Ready" button on card
2. All non-cancelled items become READY
3. Order status updates to READY

### Order Status Sync

When all items in an order are marked READY:
- Order status automatically changes to READY
- Card can be dismissed or archived
- Waiter/server is notified (if notifications enabled)

---

## Stations

### What are Stations?

Stations represent different preparation areas in your kitchen. Items are routed to the appropriate station based on product configuration.

### Default Stations

| Station | Description | Example Items |
|---------|-------------|---------------|
| **KITCHEN** | Main cooking area | Entrees, sides, desserts |
| **BAR** | Beverage preparation | Cocktails, mocktails, fresh juices |
| **GRILL** | Grilling station | BBQ items, grilled meats |
| **SALAD** | Cold prep station | Salads, cold appetizers |

### Station Assignment

Items are assigned to stations when products are created:

```javascript
// Product configuration
{
  "name": "Grilled Chicken",
  "station": "GRILL",  // Routed to grill station KOT
  // ...
}
```

### Station Filtering

In KDS, filter orders by station:

1. Click station dropdown in header
2. Select station (or "ALL" for everything)
3. Only orders with items for that station appear

---

## Configuration

### KDS Settings

Access: **KDS → Settings (⚙️)**

| Setting | Default | Description |
|---------|---------|-------------|
| `enableSound` | true | Play sound for new orders |
| `soundVolume` | 70 | Volume level (0-100) |
| `groupByTable` | false | Group multiple orders per table |
| `printOnCreate` | true | Auto-print KOT on order creation |
| `refreshInterval` | 5000 | Polling interval in milliseconds |

### Sound Configuration

**Enable/Disable:**
```bash
PUT /api/kds/config
Content-Type: application/json

{
  "enableSound": true,
  "soundVolume": 80
}
```

**Sound File:**
Located at `/public/sounds/order-alert.mp3`

### Display Setup

For dedicated kitchen display:
1. Open KDS page in browser
2. Press F11 for full-screen
3. Consider using a touchscreen monitor
4. Set browser to auto-start on boot

---

## API Reference

### Get KDS Configuration

```http
GET /api/kds/config
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "enableSound": true,
    "soundVolume": 70,
    "groupByTable": false,
    "printOnCreate": true
  }
}
```

### Update KDS Configuration

```http
PUT /api/kds/config
Content-Type: application/json

{
  "enableSound": false,
  "soundVolume": 50
}
```

### Get Pending Orders (Polling Endpoint)

```http
GET /api/kds/orders?station=KITCHEN&limit=20
```

Query Parameters:
- `station`: Filter by station (optional, default: ALL)
- `limit`: Maximum orders to return (default: 20)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "cly456...",
      "orderNumber": "ORD-240513-042",
      "orderType": "DINE_IN",
      "status": "CONFIRMED",
      "createdAt": "2024-05-13T10:30:00Z",
      "table": {
        "id": "clz789...",
        "tableNumber": "T5"
      },
      "items": [
        {
          "id": "item123...",
          "productName": "Butter Chicken",
          "quantity": 2,
          "status": "PENDING",
          "station": "KITCHEN",
          "notes": "Extra spicy"
        }
      ]
    }
  ]
}
```

### Update Order Item Status

```http
PATCH /api/kds/orders/{orderId}/items/{itemId}
Content-Type: application/json

{
  "status": "PREPARING"
}
```

### Mark Order Ready

```http
POST /api/kds/orders/{orderId}/ready
```

Marks all non-cancelled items as READY and updates order status.

### Get KOT Receipts

```http
GET /api/orders/{orderId}/kots
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "kot123...",
      "kotNumber": "KOT-240513-001",
      "station": "KITCHEN",
      "printCount": 1,
      "printedAt": "2024-05-13T10:30:00Z",
      "items": [
        {"productName": "Butter Chicken", "quantity": 2}
      ]
    }
  ]
}
```

---

## Best Practices

### Display Placement

- Mount at eye level for standing staff
- Use anti-glare screen in well-lit kitchens
- Position away from heat sources and splashes
- Consider multiple displays for large kitchens

### Sound Alerts

- Use distinctive sounds that cut through kitchen noise
- Test volume levels during busy service
- Have backup visual alerts (flashing screen)
- Train staff to acknowledge new orders promptly

### Workflow Tips

1. **FIFO Principle**: Work oldest orders first (red > yellow > green)
2. **Station Focus**: Filter to your station during rush
3. **Batch Similar Items**: Mark multiple similar items together
4. **Communicate**: Verbal callouts when marking ready
5. **Clear Done Orders**: Archive/dismiss completed orders promptly

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Orders not appearing | Check network, verify polling is active |
| Sound not playing | Check browser permissions, volume settings |
| Slow updates | Reduce refresh interval, check server load |
| Items stuck | Manually refresh, check for JS errors |

---

## Keyboard Shortcuts (KDS Page)

| Shortcut | Action |
|----------|--------|
| `R` | Refresh orders |
| `S` | Toggle sound |
| `F` | Toggle fullscreen |
| `1-9` | Mark item N as preparing |
| `Shift + 1-9` | Mark item N as ready |
| `Enter` | Mark all ready on first card |

---

## Related Documentation

- [Restaurant POS Overview](./RESTAURANT-POS.md)
- [Table Management](./TABLE-MANAGEMENT.md)
- [Recipe Management](./RECIPES.md)
