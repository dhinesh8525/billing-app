/**
 * Recipes API Route
 *
 * GET /api/recipes - List recipes
 * POST /api/recipes - Create a new recipe
 */

import { NextRequest } from "next/server"
import { RecipeService } from "@/services/recipe.service"
import { createRecipeSchema, recipeQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, recipeQuerySchema)
    const result = await RecipeService.listRecipes(tenantId, query)
    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await parseBody(request, createRecipeSchema)
    const recipe = await RecipeService.createRecipe(tenantId, body)
    return apiResponse(recipe, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
