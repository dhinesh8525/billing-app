/**
 * Mark Order Ready API Route
 *
 * POST /api/orders/[id]/ready - Mark all items in order as ready
 */

import { NextRequest } from "next/server"
import { OrderService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    await OrderService.markOrderReady(tenantId, id)
    return apiResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
