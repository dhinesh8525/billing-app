/**
 * Bill Split/Merge Validation Schemas
 *
 * Zod schemas for validating bill operations.
 */

import { z } from "zod"

/**
 * Schema for splitting a bill by items
 */
export const splitByItemsSchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice ID"),
  splits: z.array(
    z.object({
      itemIds: z.array(z.string()).min(1, "Must select at least one item"),
      customerName: z.string().max(100).optional().nullable(),
    })
  ).min(2, "Must split into at least 2 bills"),
})

/**
 * Schema for splitting a bill equally
 */
export const splitEquallySchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice ID"),
  numberOfSplits: z.number().int().min(2, "Must split into at least 2 bills").max(20),
  customerNames: z.array(z.string().max(100)).optional(),
})

/**
 * Schema for splitting a bill by percentage
 */
export const splitByPercentageSchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice ID"),
  splits: z.array(
    z.object({
      percentage: z.number().positive().max(100),
      customerName: z.string().max(100).optional().nullable(),
    })
  ).min(2, "Must split into at least 2 bills").refine(
    (splits) => {
      const total = splits.reduce((sum, s) => sum + s.percentage, 0)
      return Math.abs(total - 100) < 0.01
    },
    "Percentages must add up to 100%"
  ),
})

/**
 * Schema for merging bills
 */
export const mergeBillsSchema = z.object({
  invoiceIds: z.array(z.string().cuid()).min(2, "Must select at least 2 invoices to merge"),
  primaryInvoiceId: z.string().cuid("Invalid primary invoice ID"),
})

/**
 * Schema for merging tables (move orders)
 */
export const mergeTableOrdersSchema = z.object({
  sourceTableId: z.string().cuid("Invalid source table ID"),
  targetTableId: z.string().cuid("Invalid target table ID"),
})

// Type exports
export type SplitByItemsInput = z.infer<typeof splitByItemsSchema>
export type SplitEquallyInput = z.infer<typeof splitEquallySchema>
export type SplitByPercentageInput = z.infer<typeof splitByPercentageSchema>
export type MergeBillsInput = z.infer<typeof mergeBillsSchema>
export type MergeTableOrdersInput = z.infer<typeof mergeTableOrdersSchema>
