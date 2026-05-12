# Bill Operations

Complete guide to split bill and merge table functionality.

## Table of Contents

1. [Overview](#overview)
2. [Split Bill](#split-bill)
3. [Merge Bills](#merge-bills)
4. [Merge Tables](#merge-tables)
5. [Bill Transaction History](#bill-transaction-history)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

---

## Overview

Bill Operations provide flexibility for handling payments in restaurant scenarios where customers want to split costs or combine orders.

### Key Features

- **Split by Items**: Each person pays for specific items they ordered
- **Split by Percentage**: Custom percentage splits (60/40, 70/30, etc.)
- **Split Equally**: Divide total evenly among N people
- **Merge Bills**: Combine multiple invoices into one
- **Merge Tables**: Move orders from one table to another
- **Transaction History**: Full audit trail of all split/merge operations

---

## Split Bill

### When to Use

- Group dining where individuals want to pay separately
- Corporate events with separate department billing
- Couples on a date splitting the check

### Split Types

#### 1. Split by Items

Each person pays for exactly what they ordered.

**Example:**
```
Original Bill: ₹2,000
├── Person A: Biryani (₹450) + Lassi (₹80) = ₹530
├── Person B: Pizza (₹600) + Coke (₹50) = ₹650
└── Person C: Pasta (₹400) + Dessert (₹420) = ₹820
```

**Via UI:**
1. Open invoice details
2. Click **Split Bill**
3. Select **By Items** tab
4. Create splits and assign items to each
5. Optionally add customer names
6. Click **Split**

**Via API:**
```bash
POST /api/bills/{invoiceId}/split
Content-Type: application/json

{
  "splitType": "items",
  "splits": [
    {
      "itemIds": ["item1", "item2"],
      "customerName": "John"
    },
    {
      "itemIds": ["item3", "item4"],
      "customerName": "Jane"
    }
  ]
}
```

#### 2. Split by Percentage

Custom percentage allocation regardless of who ordered what.

**Example:**
```
Original Bill: ₹2,000
├── Person A (60%): ₹1,200
└── Person B (40%): ₹800
```

**Via UI:**
1. Open invoice details
2. Click **Split Bill**
3. Select **By Percentage** tab
4. Add splits with percentages (must total 100%)
5. Click **Split**

**Via API:**
```bash
POST /api/bills/{invoiceId}/split
Content-Type: application/json

{
  "splitType": "percentage",
  "splits": [
    {"percentage": 60, "customerName": "Company A"},
    {"percentage": 40, "customerName": "Company B"}
  ]
}
```

#### 3. Split Equally

Simple equal division among N people.

**Example:**
```
Original Bill: ₹2,000
Split 4 ways: ₹500 each
```

**Via UI:**
1. Open invoice details
2. Click **Split Bill**
3. Select **Split Equally** tab
4. Enter number of people
5. Optionally add names
6. Click **Split**

**Via API:**
```bash
POST /api/bills/{invoiceId}/split
Content-Type: application/json

{
  "splitType": "equal",
  "numberOfSplits": 4,
  "customerNames": ["Alice", "Bob", "Charlie", "Diana"]
}
```

### Split Bill Rules

1. **Original invoice is cancelled** after splitting
2. **New invoices are created** for each split portion
3. **Tax is proportionally distributed** to split invoices
4. **Rounding adjustments** handled on last split
5. **Transaction history** maintains link to original

---

## Merge Bills

### When to Use

- Tables getting combined during service
- Multiple orders for same customer
- Correcting accidentally split orders

### How It Works

Multiple invoices are combined into a single new invoice:

```
Invoice A: ₹500 (2 items)  ─┐
Invoice B: ₹700 (3 items)  ─┼─→ Merged Invoice: ₹1,200 (5 items)
Invoice C: ₹300 (1 item)   ─┘
```

**Via UI:**
1. Navigate to **Invoices**
2. Select invoices to merge (checkbox)
3. Click **Merge Selected**
4. Choose primary invoice (for customer info)
5. Confirm merge

**Via API:**
```bash
POST /api/bills/merge
Content-Type: application/json

{
  "invoiceIds": ["inv1", "inv2", "inv3"],
  "primaryInvoiceId": "inv1"
}
```

### Merge Rules

1. **All source invoices must be COMPLETED** (not cancelled)
2. **Items from all invoices** are combined
3. **Customer info** taken from primary invoice
4. **Source invoices are cancelled** after merge
5. **New invoice number** is generated

---

## Merge Tables

### When to Use

- Group needs more space, moving to larger table
- Combining parties who arrived separately
- VIP upgrade to different table

### How It Works

All active orders from source table are moved to target table:

```
Table T1 (source):
├── Order #42 (3 items)
└── Order #45 (2 items)
          │
          ▼ Merge to Table T5

Table T5 (target):
├── Order #40 (existing, 4 items)
├── Order #42 (moved, 3 items)
└── Order #45 (moved, 2 items)

Table T1: Now AVAILABLE
```

**Via UI:**
1. Navigate to **Tables**
2. Click on source table
3. Click **Merge to Another Table**
4. Select target table
5. Confirm merge

**Via API:**
```bash
POST /api/tables/merge
Content-Type: application/json

{
  "sourceTableId": "table1",
  "targetTableId": "table5"
}
```

### Merge Table Rules

1. **Source table becomes AVAILABLE** after merge
2. **Target table status unchanged** (usually OCCUPIED)
3. **Order history preserved** (shows original table)
4. **Only active orders moved** (COMPLETED/CANCELLED stay)

---

## Bill Transaction History

Every split and merge operation is recorded for audit purposes.

### Transaction Types

| Type | Description |
|------|-------------|
| `ORIGINAL` | Initial invoice creation |
| `SPLIT_SOURCE` | Invoice that was split |
| `SPLIT_TARGET` | New invoice from split |
| `MERGE_SOURCE` | Invoice that was merged |
| `MERGE_TARGET` | New invoice from merge |

### Viewing History

**Via UI:**
1. Open invoice details
2. Click **History** tab
3. View all related transactions

**Via API:**
```bash
GET /api/bills/{invoiceId}/history
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "tx123...",
      "transactionType": "SPLIT_SOURCE",
      "sourceInvoiceId": null,
      "targetInvoiceId": "inv456...",
      "amount": 2000,
      "reason": "Split into 3 bills",
      "createdAt": "2024-05-13T14:30:00Z",
      "createdBy": {"name": "John Staff"}
    },
    {
      "id": "tx124...",
      "transactionType": "SPLIT_TARGET",
      "sourceInvoiceId": "inv123...",
      "amount": 530,
      "reason": "Split from original bill",
      "createdAt": "2024-05-13T14:30:00Z"
    }
  ]
}
```

### Transaction Chain

For complex operations, you can trace the full history:

```
INV-001 (Original: ₹2000)
    │
    ├── SPLIT_SOURCE ──→ Cancelled
    │
    ├── INV-002 (SPLIT_TARGET: ₹800)
    │       │
    │       └── MERGE_SOURCE ──→ Cancelled
    │
    ├── INV-003 (SPLIT_TARGET: ₹1200)
    │       │
    │       └── MERGE_SOURCE ──→ Cancelled
    │
    └──────────────────────────────────┐
                                       │
INV-004 (MERGE_TARGET: ₹2000) ◀────────┘
```

---

## API Reference

### Split Bill

```http
POST /api/bills/{invoiceId}/split
Content-Type: application/json
```

**Split by Items:**
```json
{
  "splitType": "items",
  "splits": [
    {
      "itemIds": ["item1", "item2"],
      "customerName": "John"
    },
    {
      "itemIds": ["item3"],
      "customerName": "Jane"
    }
  ]
}
```

**Split by Percentage:**
```json
{
  "splitType": "percentage",
  "splits": [
    {"percentage": 60, "customerName": "Company A"},
    {"percentage": 40, "customerName": "Company B"}
  ]
}
```

**Split Equally:**
```json
{
  "splitType": "equal",
  "numberOfSplits": 3,
  "customerNames": ["Alice", "Bob", "Charlie"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalInvoice": {
      "id": "inv123...",
      "invoiceNumber": "INV-2405-001",
      "status": "CANCELLED"
    },
    "newInvoices": [
      {
        "id": "inv456...",
        "invoiceNumber": "INV-2405-002",
        "total": 800,
        "customerName": "John"
      },
      {
        "id": "inv789...",
        "invoiceNumber": "INV-2405-003",
        "total": 1200,
        "customerName": "Jane"
      }
    ]
  }
}
```

### Merge Bills

```http
POST /api/bills/merge
Content-Type: application/json

{
  "invoiceIds": ["inv1", "inv2", "inv3"],
  "primaryInvoiceId": "inv1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mergedInvoice": {
      "id": "inv999...",
      "invoiceNumber": "INV-2405-010",
      "total": 2500,
      "items": [...],
      "notes": "Merged from 3 bills"
    },
    "originalInvoices": [
      {"id": "inv1", "status": "CANCELLED"},
      {"id": "inv2", "status": "CANCELLED"},
      {"id": "inv3", "status": "CANCELLED"}
    ]
  }
}
```

### Merge Tables

```http
POST /api/tables/merge
Content-Type: application/json

{
  "sourceTableId": "table1",
  "targetTableId": "table5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sourceTable": {
      "id": "table1",
      "tableNumber": "T1",
      "status": "AVAILABLE"
    },
    "targetTable": {
      "id": "table5",
      "tableNumber": "T5",
      "status": "OCCUPIED"
    },
    "movedOrders": 2
  }
}
```

### Get Bill History

```http
GET /api/bills/{invoiceId}/history
```

---

## Best Practices

### When Splitting Bills

1. **Confirm with guests** which split method they prefer
2. **Verify item assignments** before processing
3. **Process all payments** before guests leave
4. **Keep original receipt** available for reference

### When Merging

1. **Double-check invoice selection** before merging
2. **Choose correct primary invoice** for customer info
3. **Review merged total** before presenting to customer
4. **Explain combined charges** if asked

### Staff Training

1. Practice all split types during training
2. Understand rounding behavior
3. Know how to access transaction history
4. Handle customer questions about split amounts

### Common Scenarios

| Scenario | Recommended Action |
|----------|-------------------|
| "We'll split evenly" | Split Equally |
| "I'll pay for my food" | Split by Items |
| "Company pays 70%, I pay 30%" | Split by Percentage |
| "Can you combine our checks?" | Merge Bills |
| "We want to move to that bigger table" | Merge Tables |

---

## Troubleshooting

### Split amounts don't add up exactly
- Rounding adjustments are normal
- Last split receives any rounding difference
- Total of splits equals original (±₹1 for rounding)

### Cannot split invoice
- Invoice must be COMPLETED status
- Cannot split already cancelled invoice
- All items must be assigned to a split

### Cannot merge invoices
- All invoices must be COMPLETED
- Must select at least 2 invoices
- Invoices must belong to same tenant

### Merge tables not working
- Both tables must exist and be active
- Source table must have active orders
- Check for permission issues

---

## Related Documentation

- [Restaurant POS Overview](./RESTAURANT-POS.md)
- [Table Management](./TABLE-MANAGEMENT.md)
- [Invoice Management](./FEATURES.md#invoices)
