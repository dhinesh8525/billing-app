/**
 * Party (Customer/Supplier) Validation Schemas
 *
 * Zod schemas for validating party-related data.
 */

import { z } from "zod"

/**
 * GSTIN validation regex
 * Format: 2 digit state code + 10 digit PAN + 1 entity code + 1 digit + 1 checksum
 */
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

/**
 * PAN validation regex
 */
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

/**
 * Schema for creating a new party
 */
export const createPartySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must be a 10-digit number")
    .optional()
    .nullable(),
  email: z
    .string()
    .email("Invalid email address")
    .max(100)
    .optional()
    .nullable(),
  gstin: z
    .string()
    .regex(gstinRegex, "Invalid GSTIN format")
    .optional()
    .nullable()
    .transform((val) => val?.toUpperCase()),
  pan: z
    .string()
    .regex(panRegex, "Invalid PAN format")
    .optional()
    .nullable()
    .transform((val) => val?.toUpperCase()),
  billingAddress: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  shippingAddress: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  type: z
    .enum(["customer", "supplier", "both"])
    .default("customer"),
  openingBalance: z
    .number()
    .default(0),
  creditLimit: z
    .number()
    .nonnegative("Credit limit cannot be negative")
    .optional()
    .nullable(),
  creditDays: z
    .number()
    .int()
    .nonnegative("Credit days cannot be negative")
    .max(365)
    .default(0),
})

/**
 * Schema for updating a party
 */
export const updatePartySchema = createPartySchema.partial().extend({
  isActive: z.boolean().optional(),
})

/**
 * Schema for party list query
 */
export const partyQuerySchema = z.object({
  type: z.enum(["customer", "supplier", "both"]).optional(),
  search: z.string().max(100).optional(),
  hasBalance: z.coerce.boolean().optional(), // Filter parties with outstanding balance
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["name", "currentBalance", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

// Type exports for TypeScript
export type CreatePartyInput = z.infer<typeof createPartySchema>
export type UpdatePartyInput = z.infer<typeof updatePartySchema>
export type PartyQuery = z.infer<typeof partyQuerySchema>
