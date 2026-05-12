/**
 * Recipe by ID API Route
 *
 * GET /api/recipes/[id] - Get recipe details with cost calculation
 * PUT /api/recipes/[id] - Update recipe
 * DELETE /api/recipes/[id] - Delete recipe
 */

import { NextRequest } from "next/server"
import { RecipeService } from "@/services/recipe.service"
import { updateRecipeSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const recipe = await RecipeService.getRecipeById(tenantId, id)
    return apiResponse(recipe)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, updateRecipeSchema)
    const recipe = await RecipeService.updateRecipe(tenantId, id, body)
    return apiResponse(recipe)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    await RecipeService.deleteRecipe(tenantId, id)
    return apiResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
