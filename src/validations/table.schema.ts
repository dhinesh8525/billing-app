/**
 * Table & Floor Plan Validation Schemas
 *
 * Zod schemas for validating table and floor plan data.
 */

import { z } from "zod"

/**
 * Floor plan layout configuration
 */
export const floorPlanLayoutSchema = z.object({
  width: z.number().int().positive().max(2000).default(800),
  height: z.number().int().positive().max(2000).default(600),
  gridSize: z.number().int().positive().max(100).default(20),
})

/**
 * Schema for creating a floor plan
 */
export const createFloorPlanSchema = z.object({
  name: z
    .string()
    .min(1, "Floor plan name is required")
    .max(50, "Name must not exceed 50 characters"),
  layout: floorPlanLayoutSchema.optional(),
  isActive: z.boolean().default(true),
})

/**
 * Schema for updating a floor plan
 */
export const updateFloorPlanSchema = createFloorPlanSchema.partial()

/**
 * Schema for creating a table
 */
export const createTableSchema = z.object({
  floorPlanId: z.string().cuid("Invalid floor plan ID"),
  tableNumber: z
    .string()
    .min(1, "Table number is required")
    .max(20, "Table number must not exceed 20 characters"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .positive("Capacity must be at least 1")
    .max(50, "Capacity cannot exceed 50"),
  x: z.number().int().nonnegative().default(0),
  y: z.number().int().nonnegative().default(0),
  shape: z.enum(["square", "round", "rectangle"]).default("square"),
  isActive: z.boolean().default(true),
})

/**
 * Schema for updating a table
 */
export const updateTableSchema = createTableSchema.partial().omit({ floorPlanId: true })

/**
 * Schema for updating table status
 */
export const updateTableStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "BILLING", "CLEANING"]),
})

/**
 * Schema for table list query
 */
export const tableQuerySchema = z.object({
  floorPlanId: z.string().cuid().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "BILLING", "CLEANING"]).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
})

/**
 * Schema for merging tables
 */
export const mergeTablesSchema = z.object({
  tableIds: z
    .array(z.string().cuid("Invalid table ID"))
    .min(2, "At least 2 tables are required for merging"),
  primaryTableId: z.string().cuid("Invalid primary table ID"),
})

// Type exports
export type FloorPlanLayout = z.infer<typeof floorPlanLayoutSchema>
export type CreateFloorPlanInput = z.infer<typeof createFloorPlanSchema>
export type UpdateFloorPlanInput = z.infer<typeof updateFloorPlanSchema>
export type CreateTableInput = z.infer<typeof createTableSchema>
export type UpdateTableInput = z.infer<typeof updateTableSchema>
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>
export type TableQuery = z.infer<typeof tableQuerySchema>
export type MergeTablesInput = z.infer<typeof mergeTablesSchema>
