/**
 * Subscription Validation Schemas
 *
 * Zod schemas for subscription-related API requests.
 */

import { z } from "zod"

/**
 * Plan features schema
 */
export const planFeaturesSchema = z.object({
  maxProducts: z.number().int(),
  maxInvoices: z.number().int(),
  maxUsers: z.number().int(),
  maxParties: z.number().int(),
  reports: z.boolean(),
  multiLocation: z.boolean(),
  api: z.boolean(),
})

/**
 * Create plan schema (admin only)
 */
export const createPlanSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  features: planFeaturesSchema,
  isPopular: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

/**
 * Update plan schema (admin only)
 */
export const updatePlanSchema = createPlanSchema.partial().omit({ slug: true })

/**
 * Change subscription schema
 */
export const changeSubscriptionSchema = z.object({
  planId: z.string().min(1),
  razorpaySubscriptionId: z.string().optional(),
  razorpayCustomerId: z.string().optional(),
})

/**
 * Cancel subscription schema
 */
export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
  reason: z.string().max(500).optional(),
})

/**
 * Activate subscription schema (from Razorpay webhook)
 */
export const activateSubscriptionSchema = z.object({
  razorpaySubscriptionId: z.string(),
  razorpayCustomerId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  periodMonths: z.number().int().min(1).default(1),
})

// Type exports
export type PlanFeatures = z.infer<typeof planFeaturesSchema>
export type CreatePlanInput = z.infer<typeof createPlanSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
export type ChangeSubscriptionInput = z.infer<typeof changeSubscriptionSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type ActivateSubscriptionInput = z.infer<typeof activateSubscriptionSchema>
