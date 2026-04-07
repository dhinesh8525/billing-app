# API Documentation

The Billing App provides a RESTful API for programmatic access to your data.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API requests require an API key passed in the header:

```bash
X-API-Key: your-api-key
```

### Getting an API Key

1. Go to Settings > API Keys
2. Click "Generate New Key"
3. Copy the key (shown only once)
4. Store securely

### API Key Scopes

| Scope | Description |
|-------|-------------|
| `products:read` | Read product data |
| `products:write` | Create/update products |
| `invoices:read` | Read invoice data |
| `invoices:write` | Create invoices |
| `parties:read` | Read party data |
| `parties:write` | Create/update parties |

---

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Products API

### List Products

```http
GET /api/v1/products
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search by name or SKU |
| `category` | string | Filter by category ID |
| `lowStock` | boolean | Filter low stock items |
| `isActive` | boolean | Filter by active status |

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/products?page=1&pageSize=20" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "Product Name",
      "sku": "SKU001",
      "barcode": "1234567890123",
      "price": 99.99,
      "costPrice": 50.00,
      "stock": 100,
      "minStock": 10,
      "unit": "pcs",
      "hsn": "1234",
      "taxRate": 18,
      "categoryId": "clx456...",
      "category": {
        "id": "clx456...",
        "name": "Electronics"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Get Product

```http
GET /api/v1/products/:productId
```

**Example Request:**
```bash
curl -X GET "https://api.example.com/api/v1/products/clx123..." \
  -H "X-API-Key: your-api-key"
```

### Create Product

```http
POST /api/v1/products
```

**Request Body:**
```json
{
  "name": "New Product",
  "sku": "SKU002",
  "barcode": "1234567890124",
  "price": 149.99,
  "costPrice": 75.00,
  "stock": 50,
  "minStock": 5,
  "unit": "pcs",
  "hsn": "1234",
  "taxRate": 18,
  "categoryId": "clx456...",
  "description": "Product description"
}
```

**Required Fields:** `name`, `sku`, `price`

**Example Request:**
```bash
curl -X POST "https://api.example.com/api/v1/products" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Product", "sku": "SKU002", "price": 149.99}'
```

### Update Product

```http
PUT /api/v1/products/:productId
```

**Request Body:** (partial update supported)
```json
{
  "price": 159.99,
  "stock": 75
}
```

### Delete Product

```http
DELETE /api/v1/products/:productId
```

Performs a soft delete (sets `isActive` to false).

---

## Invoices API

### List Invoices

```http
GET /api/v1/invoices
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `pageSize` | number | Items per page |
| `type` | string | SALE, PURCHASE, EXPENSE |
| `status` | string | DRAFT, COMPLETED, CANCELLED |
| `paymentStatus` | string | unpaid, partial, paid |
| `startDate` | string | Filter from date (ISO 8601) |
| `endDate` | string | Filter to date (ISO 8601) |
| `partyId` | string | Filter by party |

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx789...",
      "invoiceNumber": "INV-2024-0001",
      "type": "SALE",
      "status": "COMPLETED",
      "paymentStatus": "paid",
      "customerName": "John Doe",
      "customerPhone": "9876543210",
      "partyId": "clx321...",
      "party": {
        "id": "clx321...",
        "name": "John Doe"
      },
      "subtotal": 1000.00,
      "discountPercent": 10,
      "discountAmount": 100.00,
      "taxableAmount": 900.00,
      "taxRate": 18,
      "taxAmount": 162.00,
      "total": 1062.00,
      "amountPaid": 1062.00,
      "invoiceDate": "2024-01-15T00:00:00.000Z",
      "dueDate": "2024-02-15T00:00:00.000Z",
      "items": [
        {
          "id": "clx111...",
          "productId": "clx123...",
          "productName": "Product Name",
          "productSku": "SKU001",
          "quantity": 2,
          "unitPrice": 500.00,
          "discount": 0,
          "taxRate": 18,
          "lineTotal": 1000.00
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Invoice

```http
GET /api/v1/invoices/:invoiceId
```

Returns full invoice details including all items.

### Create Invoice

```http
POST /api/v1/invoices
```

**Request Body:**
```json
{
  "type": "SALE",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "partyId": "clx321...",
  "items": [
    {
      "productId": "clx123...",
      "quantity": 2,
      "unitPrice": 500.00,
      "discount": 0
    }
  ],
  "discountPercent": 10,
  "taxRate": 18,
  "paymentMode": "cash",
  "notes": "Thank you for your purchase",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15"
}
```

**Required Fields:** `type`, `items` (at least one)

**Notes:**
- Stock is automatically decremented for SALE invoices
- Stock is automatically incremented for PURCHASE invoices
- Party balance is updated automatically
- Invoice number is auto-generated

---

## Parties API

### List Parties

```http
GET /api/v1/parties
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `pageSize` | number | Items per page |
| `type` | string | customer, supplier, both |
| `search` | string | Search by name/phone |
| `hasBalance` | boolean | Filter parties with balance |

### Get Party

```http
GET /api/v1/parties/:partyId
```

### Create Party

```http
POST /api/v1/parties
```

**Request Body:**
```json
{
  "name": "Customer Name",
  "type": "customer",
  "phone": "9876543210",
  "email": "customer@example.com",
  "gstin": "29XXXXX1234X1Z5",
  "address": "123 Main Street",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "openingBalance": 0
}
```

### Update Party

```http
PUT /api/v1/parties/:partyId
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing API key |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `INSUFFICIENT_STOCK` | Not enough stock for sale |
| `DUPLICATE_SKU` | SKU already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PLAN_LIMIT_EXCEEDED` | Subscription limit reached |

---

## Rate Limits

| Plan | Requests/Day |
|------|--------------|
| Free | 100 |
| Starter | 1,000 |
| Professional | 10,000 |
| Enterprise | Unlimited |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1704067200
```

---

## Webhooks (Coming Soon)

Future webhook support for events:
- `invoice.created`
- `invoice.paid`
- `product.low_stock`
- `party.created`

---

## SDKs & Libraries

### JavaScript/TypeScript
```bash
npm install @billing-app/sdk
```

```typescript
import { BillingClient } from '@billing-app/sdk'

const client = new BillingClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com'
})

// List products
const products = await client.products.list({ page: 1 })

// Create invoice
const invoice = await client.invoices.create({
  type: 'SALE',
  items: [{ productId: '...', quantity: 1 }]
})
```

### Python
```bash
pip install billing-app-sdk
```

```python
from billing_app import BillingClient

client = BillingClient(api_key='your-api-key')

# List products
products = client.products.list(page=1)

# Create invoice
invoice = client.invoices.create(
    type='SALE',
    items=[{'product_id': '...', 'quantity': 1}]
)
```

*Note: SDKs are planned for future release*
