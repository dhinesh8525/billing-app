/**
 * Invoice Validation Schemas
 *
 * Zod schemas for validating invoice-related data.
 * Used in API routes and form validation.
 */

import { z } from "zod"
import { TransactionType, InvoiceStatus } from "@prisma/client"

/**
 * Schema for a single invoice item
 */
export const invoiceItemSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  unitPrice: z
    .number()
    .positive("Unit price must be positive")
    .optional(), // Optional: defaults to product price
  discount: z
    .number()
    .nonnegative("Discount cannot be negative")
    .default(0),
})

/**
 * Schema for creating a new invoice
 */
export const createInvoiceSchema = z.object({
  type: z
    .nativeEnum(TransactionType)
    .default(TransactionType.SALE),
  partyId: z.string().cuid().optional().nullable(),
  customerName: z
    .string()
    .max(100, "Customer name must not exceed 100 characters")
    .optional()
    .nullable(),
  customerPhone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must be a 10-digit number")
    .optional()
    .nullable(),
  customerEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable(),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Invoice must have at least one item"),
  discountPercent: z
    .number()
    .nonnegative("Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(0),
  notes: z
    .string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .nullable(),
  paymentMode: z
    .enum(["cash", "upi", "card", "bank_transfer", "credit", "cheque"])
    .optional()
    .nullable(),
  amountPaid: z
    .number()
    .nonnegative("Amount paid cannot be negative")
    .default(0),
  isInterstate: z.boolean().default(false),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
})

/**
 * Schema for updating invoice status
 */
export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
})

/**
 * Schema for recording payment against an invoice
 */
export const recordPaymentSchema = z.object({
  amount: z
    .number()
    .positive("Payment amount must be positive"),
  paymentMode: z
    .enum(["cash", "upi", "card", "bank_transfer", "cheque"]),
  notes: z.string().max(200).optional(),
})

/**
 * Schema for invoice list query
 */
export const invoiceQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  paymentStatus: z.enum(["paid", "unpaid", "partial"]).optional(),
  partyId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["invoiceNumber", "total", "invoiceDate", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

// Type exports for TypeScript
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>
