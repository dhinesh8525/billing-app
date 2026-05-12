/**
 * Raw Materials API Route
 *
 * GET /api/raw-materials - Get products marked as raw materials
 */

import { NextRequest } from "next/server"
import { RecipeService } from "@/services/recipe.service"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const search = request.nextUrl.searchParams.get("search") || undefined
    const rawMaterials = await RecipeService.getRawMaterials(tenantId, search)
    return apiResponse(rawMaterials)
  } catch (error) {
    return handleApiError(error)
  }
}
