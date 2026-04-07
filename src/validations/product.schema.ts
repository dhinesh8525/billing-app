/**
 * Product Validation Schemas
 *
 * Zod schemas for validating product-related data.
 * Used in API routes and form validation.
 */

import { z } from "zod"

/**
 * Schema for creating a new product
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must not exceed 100 characters")
    .trim(),
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50, "SKU must not exceed 50 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "SKU can only contain letters, numbers, hyphens, and underscores")
    .transform((val) => val.toUpperCase()),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),
  price: z
    .number()
    .positive("Price must be positive")
    .max(9999999.99, "Price must not exceed 99,99,999.99"),
  costPrice: z
    .number()
    .nonnegative("Cost price cannot be negative")
    .max(9999999.99, "Cost price must not exceed 99,99,999.99")
    .optional()
    .nullable(),
  stock: z
    .number()
    .int("Stock must be a whole number")
    .nonnegative("Stock cannot be negative")
    .default(0),
  minStock: z
    .number()
    .int("Minimum stock must be a whole number")
    .nonnegative("Minimum stock cannot be negative")
    .default(5),
  unit: z
    .string()
    .min(1)
    .max(20)
    .default("pcs"),
  hsn: z
    .string()
    .max(8, "HSN code must not exceed 8 characters")
    .regex(/^[0-9]*$/, "HSN code must contain only digits")
    .optional()
    .nullable(),
  taxRate: z
    .number()
    .nonnegative("Tax rate cannot be negative")
    .max(100, "Tax rate must not exceed 100%")
    .optional()
    .nullable(),
  categoryId: z.string().cuid().optional().nullable(),
})

/**
 * Schema for updating a product
 */
export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
})

/**
 * Schema for product search query
 */
export const productSearchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  categoryId: z.string().cuid().optional(),
  isActive: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["name", "sku", "price", "stock", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

/**
 * Schema for stock adjustment
 */
export const stockAdjustmentSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().refine((val) => val !== 0, "Quantity must not be zero"),
  reason: z.string().min(1).max(200).optional(),
})

// Type exports for TypeScript
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductSearchQuery = z.infer<typeof productSearchSchema>
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>
