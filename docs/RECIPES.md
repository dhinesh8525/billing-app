# Recipe Management

Complete guide to recipe/BOM (Bill of Materials) management and food cost tracking.

## Table of Contents

1. [Overview](#overview)
2. [Concepts](#concepts)
3. [Creating Recipes](#creating-recipes)
4. [Food Cost Analysis](#food-cost-analysis)
5. [Raw Material Deduction](#raw-material-deduction)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

---

## Overview

Recipe Management links finished products (menu items) to their ingredients (raw materials), enabling:

- **Accurate Food Costing**: Know the true cost of each dish
- **Inventory Management**: Auto-deduct ingredients when items sell
- **Profit Analysis**: Compare food cost to selling price
- **Menu Pricing**: Make informed pricing decisions

### Key Features

- Create recipes for any product
- Add multiple ingredients with quantities
- Track wastage percentage per ingredient
- Calculate food cost automatically
- View food cost % against selling price
- Generate food cost reports

---

## Concepts

### Products vs Raw Materials

| Type | Description | Example |
|------|-------------|---------|
| **Product** | Finished item sold to customers | Butter Chicken, Mojito |
| **Raw Material** | Ingredient used in recipes | Chicken, Butter, Mint |

Raw materials are products with `isRawMaterial: true`.

### Recipe Structure

```
Recipe: Butter Chicken
├── Chicken Breast (500g) - ₹150
├── Butter (100g) - ₹50
├── Tomato Puree (200g) - ₹30
├── Cream (100ml) - ₹40
├── Spices Mix (20g) - ₹20
└── Total Food Cost: ₹290

Selling Price: ₹450
Food Cost %: 64.4%
```

### Food Cost Percentage

```
Food Cost % = (Total Ingredient Cost / Selling Price) × 100
```

Industry benchmarks:
- **< 30%**: Excellent (high profit margin)
- **30-35%**: Good (healthy margin)
- **35-40%**: Average (acceptable)
- **> 40%**: Poor (consider repricing)

---

## Creating Recipes

### Via UI

1. Navigate to **Recipes** page
2. Click **New Recipe**
3. Select the product this recipe is for
4. Add ingredients:
   - Search for raw material
   - Enter quantity and unit
   - Add wastage % if applicable
5. Review calculated food cost
6. Click **Save Recipe**

### Via API

```bash
POST /api/recipes
Content-Type: application/json

{
  "productId": "prod123...",
  "name": "Butter Chicken Recipe",
  "ingredients": [
    {
      "rawMaterialId": "mat456...",
      "quantity": 500,
      "unit": "g",
      "wastagePercent": 5
    },
    {
      "rawMaterialId": "mat789...",
      "quantity": 100,
      "unit": "g",
      "wastagePercent": 0
    }
  ]
}
```

### Recipe Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `productId` | string | The menu item this recipe is for |
| `name` | string | Recipe name (often same as product) |
| `isActive` | boolean | Whether recipe is in use |
| `ingredients` | RecipeIngredient[] | List of ingredients |

### Ingredient Properties

| Property | Type | Description |
|----------|------|-------------|
| `rawMaterialId` | string | Reference to raw material product |
| `quantity` | decimal | Amount needed |
| `unit` | string | Unit of measurement |
| `wastagePercent` | decimal | Expected wastage % |
| `costPerUnit` | decimal | Cost per unit of raw material |

---

## Food Cost Analysis

### Recipe Cost Calculation

For each ingredient:
```
Ingredient Cost = Quantity × Cost Per Unit × (1 + Wastage% / 100)
```

Total recipe cost:
```
Recipe Cost = Sum of all Ingredient Costs
```

### Example Calculation

**Butter Chicken Recipe:**

| Ingredient | Qty | Unit | Cost/Unit | Wastage | Cost |
|------------|-----|------|-----------|---------|------|
| Chicken | 500 | g | ₹0.30 | 5% | ₹157.50 |
| Butter | 100 | g | ₹0.50 | 0% | ₹50.00 |
| Tomatoes | 200 | g | ₹0.15 | 10% | ₹33.00 |
| Cream | 100 | ml | ₹0.40 | 0% | ₹40.00 |
| Spices | 20 | g | ₹1.00 | 0% | ₹20.00 |
| **Total** | | | | | **₹300.50** |

Selling Price: ₹450
Food Cost %: 66.8%

### Food Cost Report

Access: **Reports → Food Cost**

The report shows:
- All products with recipes
- Food cost per item
- Selling price
- Food cost %
- Gross margin

```
┌────────────────────┬───────────┬────────────┬──────────┬────────┐
│ Product            │ Food Cost │ Sell Price │ Cost %   │ Margin │
├────────────────────┼───────────┼────────────┼──────────┼────────┤
│ Butter Chicken     │ ₹300.50   │ ₹450       │ 66.8%    │ 33.2%  │
│ Paneer Tikka       │ ₹120.00   │ ₹350       │ 34.3%    │ 65.7%  │
│ Veg Biryani        │ ₹85.00    │ ₹250       │ 34.0%    │ 66.0%  │
│ Mojito             │ ₹45.00    │ ₹180       │ 25.0%    │ 75.0%  │
└────────────────────┴───────────┴────────────┴──────────┴────────┘
```

---

## Raw Material Deduction

### How It Works

When a product with a recipe is sold, the system automatically deducts the required raw materials from inventory.

```
Sale: 2× Butter Chicken

Automatic Deduction:
├── Chicken: -1000g (500g × 2)
├── Butter: -200g (100g × 2)
├── Tomatoes: -400g (200g × 2)
├── Cream: -200ml (100ml × 2)
└── Spices: -40g (20g × 2)
```

### Deduction Trigger Points

Deduction happens when:
1. ✅ Invoice is created (via billing)
2. ✅ Order is converted to invoice
3. ❌ Order is created (ingredients NOT deducted yet)

This ensures ingredients are only deducted when the sale is confirmed.

### Handling Wastage

Wastage is factored into the deduction:

```
Actual Deduction = Quantity × (1 + Wastage% / 100)
```

Example: If chicken has 5% wastage and recipe needs 500g:
```
Deducted: 500 × 1.05 = 525g
```

---

## API Reference

### List Recipes

```http
GET /api/recipes?page=1&pageSize=20
```

Response:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "rec123...",
        "name": "Butter Chicken Recipe",
        "productId": "prod456...",
        "product": {
          "name": "Butter Chicken",
          "price": 450
        },
        "totalCost": 300.50,
        "foodCostPercent": 66.8,
        "_count": {"ingredients": 5}
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45
    }
  }
}
```

### Get Recipe Details

```http
GET /api/recipes/{id}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "rec123...",
    "name": "Butter Chicken Recipe",
    "product": {
      "id": "prod456...",
      "name": "Butter Chicken",
      "price": 450
    },
    "ingredients": [
      {
        "id": "ing789...",
        "rawMaterial": {
          "id": "mat123...",
          "name": "Chicken Breast",
          "unit": "g"
        },
        "quantity": 500,
        "unit": "g",
        "wastagePercent": 5,
        "costPerUnit": 0.30
      }
    ],
    "totalCost": 300.50,
    "foodCostPercent": 66.8
  }
}
```

### Create Recipe

```http
POST /api/recipes
Content-Type: application/json

{
  "productId": "prod456...",
  "name": "Butter Chicken Recipe",
  "ingredients": [
    {
      "rawMaterialId": "mat123...",
      "quantity": 500,
      "unit": "g",
      "wastagePercent": 5
    }
  ]
}
```

### Update Recipe

```http
PUT /api/recipes/{id}
Content-Type: application/json

{
  "name": "Updated Butter Chicken Recipe",
  "ingredients": [
    {
      "rawMaterialId": "mat123...",
      "quantity": 450,
      "unit": "g",
      "wastagePercent": 5
    },
    {
      "rawMaterialId": "mat456...",
      "quantity": 120,
      "unit": "g",
      "wastagePercent": 0
    }
  ]
}
```

### Delete Recipe

```http
DELETE /api/recipes/{id}
```

### Get Raw Materials

```http
GET /api/raw-materials?search=chicken
```

Returns products where `isRawMaterial: true`.

### Food Cost Report

```http
GET /api/reports/food-cost?startDate=2024-05-01&endDate=2024-05-31
```

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "prod456...",
        "productName": "Butter Chicken",
        "recipeCost": 300.50,
        "sellingPrice": 450,
        "foodCostPercent": 66.8,
        "grossMargin": 33.2,
        "unitsSold": 150,
        "totalCost": 45075,
        "totalRevenue": 67500
      }
    ],
    "summary": {
      "averageFoodCostPercent": 35.2,
      "totalFoodCost": 125000,
      "totalRevenue": 355000
    }
  }
}
```

---

## Best Practices

### Recipe Creation

1. **Accurate Measurements**: Use precise quantities
2. **Consistent Units**: Stick to g/ml for accuracy
3. **Include Wastage**: Account for peeling, trimming, spillage
4. **Regular Updates**: Update when recipes change
5. **Test Batches**: Verify costs with actual preparation

### Raw Material Management

1. **Keep Costs Updated**: Update purchase prices regularly
2. **Track Stock Levels**: Set reorder points
3. **FIFO Principle**: Use oldest stock first
4. **Regular Counts**: Verify physical vs system inventory

### Cost Control

1. **Monitor High-Cost Items**: Focus on items > 40% food cost
2. **Seasonal Adjustments**: Update recipes for seasonal pricing
3. **Portion Control**: Train staff on proper portions
4. **Waste Tracking**: Log and analyze waste

### Menu Engineering

Use food cost data for menu decisions:

| Food Cost % | Popularity | Action |
|-------------|------------|--------|
| Low | High | Star - Promote heavily |
| Low | Low | Puzzle - Reposition/promote |
| High | High | Workhorse - Reduce cost or raise price |
| High | Low | Dog - Consider removing |

---

## Troubleshooting

### Food cost not calculating
1. Verify recipe has ingredients added
2. Check raw materials have cost per unit set
3. Ensure product has selling price

### Ingredients not deducting
1. Verify recipe is linked to product
2. Check sale was completed (invoice created)
3. Ensure raw material stock tracking is enabled

### Cost seems incorrect
1. Verify quantities and units match actual usage
2. Check wastage percentages are accurate
3. Ensure cost per unit is up to date

---

## Related Documentation

- [Restaurant POS Overview](./RESTAURANT-POS.md)
- [Product Management](./FEATURES.md#products)
- [Inventory Tracking](./FEATURES.md#inventory)
