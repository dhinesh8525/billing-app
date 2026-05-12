/**
 * Table Status Summary API Route
 *
 * GET /api/tables/summary - Get table status counts
 */

import { NextRequest } from "next/server"
import { TableService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const floorPlanId = request.nextUrl.searchParams.get("floorPlanId") || undefined
    const summary = await TableService.getTableStatusSummary(tenantId, floorPlanId)
    return apiResponse(summary)
  } catch (error) {
    return handleApiError(error)
  }
}
