/**
 * Food Cost Report API Route
 *
 * GET /api/reports/food-cost - Get food cost analysis report
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
    const searchParams = request.nextUrl.searchParams

    // Default to last 30 days
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date()

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const report = await RecipeService.getFoodCostReport(tenantId, startDate, endDate)
    return apiResponse(report)
  } catch (error) {
    return handleApiError(error)
  }
}
