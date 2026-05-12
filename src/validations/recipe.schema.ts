/**
 * Recipe Validation Schemas
 *
 * Zod schemas for validating recipe/BOM data.
 */

import { z } from "zod"

/**
 * Schema for a single recipe ingredient
 */
export const recipeIngredientSchema = z.object({
  rawMaterialId: z.string().cuid("Invalid raw material ID"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  wastagePercent: z.number().nonnegative().max(100).default(0),
})

/**
 * Schema for creating a recipe
 */
export const createRecipeSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  name: z.string().min(1, "Recipe name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  prepTime: z.number().int().positive().optional().nullable(),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "Recipe must have at least one ingredient"),
})

/**
 * Schema for updating a recipe
 */
export const updateRecipeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  prepTime: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1).optional(),
})

/**
 * Schema for recipe list query
 */
export const recipeQuerySchema = z.object({
  search: z.string().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

// Type exports
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
export type RecipeQuery = z.infer<typeof recipeQuerySchema>
