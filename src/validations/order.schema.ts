/**
 * Order Validation Schemas
 *
 * Zod schemas for validating restaurant order data.
 */

import { z } from "zod"

/**
 * Schema for a single order item
 */
export const orderItemSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  unitPrice: z.number().positive("Unit price must be positive"),
  notes: z.string().max(200, "Notes must not exceed 200 characters").optional().nullable(),
  station: z.enum(["KITCHEN", "BAR", "GRILL", "DESSERT"]).optional().nullable(),
})

/**
 * Schema for creating an order
 */
export const createOrderSchema = z.object({
  tableId: z.string().cuid().optional().nullable(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
  specialNotes: z.string().max(500, "Notes must not exceed 500 characters").optional().nullable(),
  guestCount: z.number().int().positive().default(1),
  items: z
    .array(orderItemSchema)
    .min(1, "Order must have at least one item"),
})

/**
 * Schema for updating an order
 */
export const updateOrderSchema = z.object({
  specialNotes: z.string().max(500).optional().nullable(),
  guestCount: z.number().int().positive().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
})

/**
 * Schema for adding items to an existing order
 */
export const addOrderItemsSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "Must add at least one item"),
})

/**
 * Schema for updating an order item status
 */
export const updateOrderItemStatusSchema = z.object({
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]),
  servedQuantity: z.number().int().nonnegative().optional(),
})

/**
 * Schema for order list query
 */
export const orderQuerySchema = z.object({
  tableId: z.string().cuid().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["orderNumber", "createdAt", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

/**
 * Schema for KDS pending orders query
 */
export const kdsQuerySchema = z.object({
  station: z.enum(["KITCHEN", "BAR", "GRILL", "DESSERT", "ALL"]).default("ALL"),
  limit: z.coerce.number().int().positive().max(50).default(20),
})

/**
 * Schema for converting order to invoice
 */
export const convertToInvoiceSchema = z.object({
  partyId: z.string().cuid().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  customerPhone: z.string().regex(/^[0-9]{10}$/).optional().nullable(),
  discountPercent: z.number().nonnegative().max(100).default(0),
  paymentMode: z.enum(["cash", "upi", "card", "bank_transfer", "credit", "cheque"]).optional().nullable(),
  amountPaid: z.number().nonnegative().default(0),
  isInterstate: z.boolean().default(false),
})

// Type exports
export type OrderItemInput = z.infer<typeof orderItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>
export type OrderQuery = z.infer<typeof orderQuerySchema>
export type KDSQuery = z.infer<typeof kdsQuerySchema>
export type ConvertToInvoiceInput = z.infer<typeof convertToInvoiceSchema>
