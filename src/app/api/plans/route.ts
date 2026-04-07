/**
 * Plans API Route
 *
 * GET /api/plans - Get all active plans (public)
 */

import { PlanService } from "@/services"
import { apiResponse, handleApiError } from "@/lib/api-utils-tenant"

export async function GET() {
  try {
    const plans = await PlanService.getActivePlans()

    return apiResponse(plans)
  } catch (error) {
    return handleApiError(error)
  }
}
