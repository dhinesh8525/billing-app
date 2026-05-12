/**
 * KDS Pending Orders API Route
 *
 * GET /api/kds/pending-orders - Get pending orders for kitchen display
 */

import { NextRequest } from "next/server"
import { KDSService } from "@/services/kds.service"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get("station") || "ALL"
    const limit = parseInt(searchParams.get("limit") || "20")

    const [orders, counts] = await Promise.all([
      KDSService.getPendingOrders(tenantId, station, limit),
      KDSService.getOrderCounts(tenantId),
    ])

    return apiResponse({ orders, counts })
  } catch (error) {
    return handleApiError(error)
  }
}
