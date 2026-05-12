# Table Management

Complete guide to floor plan creation and table management in the Restaurant POS system.

## Table of Contents

1. [Overview](#overview)
2. [Floor Plans](#floor-plans)
3. [Tables](#tables)
4. [Table Statuses](#table-statuses)
5. [Floor Plan Editor](#floor-plan-editor)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

---

## Overview

Table Management provides a visual way to organize your restaurant layout and track table occupancy in real-time.

### Key Features

- **Visual Floor Plans**: Create multiple layouts (Main Floor, Patio, Private Rooms)
- **Drag-Drop Editor**: Position tables visually on a grid
- **Real-time Status**: Track which tables are available, occupied, or billing
- **Table Shapes**: Square, round, or rectangle tables
- **Capacity Tracking**: Set and display seating capacity per table

---

## Floor Plans

### What is a Floor Plan?

A floor plan is a named layout that contains a collection of tables. Restaurants typically have multiple floor plans:

- **Main Floor**: Primary dining area
- **Patio/Outdoor**: Seasonal outdoor seating
- **Private Room**: VIP or event space
- **Bar Area**: Bar seating and high-tops

### Creating a Floor Plan

**Via UI:**
1. Navigate to **Tables** → **Edit Layout**
2. Click **Create Floor Plan**
3. Enter name (e.g., "Main Floor")
4. Configure dimensions (default: 800×600 pixels)
5. Click **Create**

**Via API:**
```bash
POST /api/floor-plans
Content-Type: application/json

{
  "name": "Main Floor",
  "layout": {
    "width": 800,
    "height": 600,
    "gridSize": 20
  }
}
```

### Floor Plan Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name (unique per tenant) |
| `layout` | JSON | Dimensions and grid settings |
| `isActive` | boolean | Whether floor plan is in use |
| `tables` | Table[] | Tables in this floor plan |

---

## Tables

### Creating Tables

**Via Floor Plan Editor:**
1. Open the floor plan editor
2. Click **Add Table**
3. Enter table number (e.g., "T1", "A1", "101")
4. Set capacity (number of seats)
5. Choose shape (Square, Round, Rectangle)
6. Click **Add Table**
7. Drag to position
8. Click **Save Layout**

**Via API:**
```bash
POST /api/tables
Content-Type: application/json

{
  "floorPlanId": "clx123...",
  "tableNumber": "T1",
  "capacity": 4,
  "shape": "square",
  "x": 100,
  "y": 100
}
```

### Table Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `tableNumber` | string | Display number (unique per tenant) |
| `capacity` | number | Seating capacity |
| `shape` | string | "square", "round", or "rectangle" |
| `x` | number | X position on floor plan |
| `y` | number | Y position on floor plan |
| `status` | TableStatus | Current status |
| `floorPlanId` | string | Parent floor plan |

### Table Shapes

| Shape | Display Size | Use Case |
|-------|-------------|----------|
| **Square** | 64×64 px | 2-4 seater tables |
| **Round** | 64×64 px | Communal or booth seating |
| **Rectangle** | 96×64 px | 6+ seater long tables |

---

## Table Statuses

Tables transition through different statuses during service:

### Status Flow

```
AVAILABLE → OCCUPIED → BILLING → CLEANING → AVAILABLE
     ↑                    ↓
     └── RESERVED ────────┘
```

### Status Definitions

| Status | Color | Description |
|--------|-------|-------------|
| **AVAILABLE** | 🟢 Green | Table is free and ready for guests |
| **OCCUPIED** | 🔵 Blue | Guests are seated, order in progress |
| **RESERVED** | 🟡 Yellow | Table is reserved for future guest |
| **BILLING** | 🟣 Purple | Bill generated, awaiting payment |
| **CLEANING** | ⚫ Gray | Table needs cleaning after guests leave |

### Automatic Status Changes

| Event | Status Change |
|-------|---------------|
| Order created for table | AVAILABLE → OCCUPIED |
| Order converted to invoice | OCCUPIED → BILLING |
| Invoice paid in full | BILLING → CLEANING |
| Invoice partially paid | BILLING (remains) |
| Order cancelled (last on table) | → AVAILABLE |

### Manual Status Updates

**Via UI:**
- Click on table in floor plan view
- Use status dropdown to change

**Via API:**
```bash
PATCH /api/tables/{id}/status
Content-Type: application/json

{
  "status": "CLEANING"
}
```

---

## Floor Plan Editor

### Overview

The floor plan editor provides a visual drag-drop interface for arranging tables.

### Features

- **Grid Snapping**: Tables snap to 20px grid for alignment
- **Drag Positioning**: Click and drag tables to move them
- **Visual Feedback**: Selected table shows ring highlight
- **Delete Tables**: Click X button on selected table
- **Save Layout**: Batch save all position changes

### Using the Editor

1. **Navigate**: Tables → Edit Layout
2. **Select Floor Plan**: Choose from dropdown (or create new)
3. **Add Tables**: Click "Add Table" button
4. **Position**: Drag tables to desired locations
5. **Delete**: Select table, click red X
6. **Save**: Click "Save Layout" to persist positions

### Grid Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `gridSize` | 20px | Snap interval for positioning |
| `width` | 800px | Canvas width |
| `height` | 600px | Canvas height |

---

## API Reference

### Floor Plans

#### List Floor Plans
```http
GET /api/floor-plans
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "Main Floor",
      "layout": {"width": 800, "height": 600, "gridSize": 20},
      "_count": {"tables": 12}
    }
  ]
}
```

#### Get Floor Plan with Tables
```http
GET /api/floor-plans/{id}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "name": "Main Floor",
    "layout": {...},
    "tables": [
      {
        "id": "cly456...",
        "tableNumber": "T1",
        "capacity": 4,
        "status": "AVAILABLE",
        "x": 100,
        "y": 100
      }
    ]
  }
}
```

#### Create Floor Plan
```http
POST /api/floor-plans
Content-Type: application/json

{
  "name": "Patio",
  "layout": {
    "width": 600,
    "height": 400,
    "gridSize": 20
  }
}
```

#### Update Floor Plan
```http
PUT /api/floor-plans/{id}
Content-Type: application/json

{
  "name": "Outdoor Patio",
  "isActive": true
}
```

#### Delete Floor Plan
```http
DELETE /api/floor-plans/{id}
```

### Tables

#### List Tables
```http
GET /api/tables?floorPlanId={id}&status=AVAILABLE
```

Query Parameters:
- `floorPlanId`: Filter by floor plan
- `status`: Filter by status
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50)

#### Get Table Status Summary
```http
GET /api/tables/summary?floorPlanId={id}
```

Response:
```json
{
  "success": true,
  "data": {
    "available": 8,
    "occupied": 3,
    "reserved": 1,
    "billing": 0,
    "cleaning": 0,
    "total": 12
  }
}
```

#### Create Table
```http
POST /api/tables
Content-Type: application/json

{
  "floorPlanId": "clx123...",
  "tableNumber": "T5",
  "capacity": 6,
  "shape": "rectangle",
  "x": 200,
  "y": 150
}
```

#### Update Table Status
```http
PATCH /api/tables/{id}/status
Content-Type: application/json

{
  "status": "RESERVED"
}
```

#### Update Table Positions (Batch)
```http
PUT /api/tables/positions
Content-Type: application/json

{
  "updates": [
    {"id": "cly456...", "x": 100, "y": 200},
    {"id": "cly789...", "x": 300, "y": 200}
  ]
}
```

#### Delete Table
```http
DELETE /api/tables/{id}
```

---

## Best Practices

### Naming Convention

Use consistent table numbering:
- **Prefix by area**: T1-T20 (tables), B1-B5 (bar), P1-P10 (patio)
- **Or use sections**: A1-A5, B1-B5, C1-C5

### Capacity Planning

- Set accurate capacities for reservation planning
- Consider maximum vs comfortable capacity
- Update if furniture changes

### Floor Plan Organization

- Create separate floor plans for distinct areas
- Group related tables together visually
- Leave space for walkways in the layout
- Update layout when physical changes occur

### Status Management

- Train staff on status meanings
- Use CLEANING status to prevent immediate re-seating
- Reserve tables sparingly (blocks availability)
- Regular status audits during slow periods

---

## Troubleshooting

### Table not showing in floor plan
1. Verify table is assigned to correct floor plan
2. Check table's x/y coordinates are within canvas bounds
3. Refresh the page

### Status not updating
1. Check for active orders on the table
2. Verify API call succeeded (check network tab)
3. Manual refresh may be needed

### Drag-drop not working
1. Ensure you're in editor mode (not view mode)
2. Click directly on the table element
3. Check for JavaScript errors in console

---

## Related Documentation

- [Restaurant POS Overview](./RESTAURANT-POS.md)
- [Kitchen Display System](./KDS.md)
- [Bill Operations](./BILL-OPERATIONS.md)
