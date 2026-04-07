/**
 * Settings Validation Schemas
 *
 * Zod schemas for validating application settings.
 */

import { z } from "zod"

/**
 * Business information settings
 */
export const businessSettingsSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN format"
    )
    .optional()
    .nullable(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .nullable(),
  address: z.string().max(500).default(""),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must be a 10-digit number")
    .optional()
    .nullable(),
  email: z.string().email().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  tagline: z.string().max(100).optional().nullable(),
  signature: z.string().url().optional().nullable(), // Digital signature image URL
})

/**
 * Tax/GST settings
 */
export const taxSettingsSchema = z.object({
  defaultTaxRate: z
    .number()
    .nonnegative()
    .max(100, "Tax rate must not exceed 100%")
    .default(18),
  enableGST: z.boolean().default(true),
  gstType: z
    .enum(["regular", "composition"])
    .default("regular"),
  stateCode: z
    .string()
    .regex(/^[0-9]{2}$/, "State code must be 2 digits")
    .optional()
    .nullable(),
})

/**
 * Invoice settings
 */
export const invoiceSettingsSchema = z.object({
  salePrefix: z.string().max(10).default("INV"),
  purchasePrefix: z.string().max(10).default("PUR"),
  expensePrefix: z.string().max(10).default("EXP"),
  termsAndConditions: z.string().max(2000).optional().nullable(),
  thankYouMessage: z.string().max(500).optional().nullable(),
  enableRoundOff: z.boolean().default(true),
  showHSN: z.boolean().default(true),
  showDiscount: z.boolean().default(true),
  printFormat: z.enum(["a4", "thermal"]).default("a4"),
})

/**
 * Complete app settings schema
 */
export const appSettingsSchema = z.object({
  business: businessSettingsSchema,
  tax: taxSettingsSchema,
  invoice: invoiceSettingsSchema,
})

/**
 * Schema for updating a single setting key
 */
export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

// Type exports for TypeScript
export type BusinessSettings = z.infer<typeof businessSettingsSchema>
export type TaxSettings = z.infer<typeof taxSettingsSchema>
export type InvoiceSettings = z.infer<typeof invoiceSettingsSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>
