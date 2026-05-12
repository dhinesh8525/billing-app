/**
 * KDS Order Item Status API Route
 *
 * PATCH /api/kds/orders/[id]/items/[itemId] - Update item status
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { KDSService } from "@/services/kds.service"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>
}

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id: orderId, itemId } = await params
    const body = await parseBody(request, updateStatusSchema)
    const item = await KDSService.updateItemStatus(tenantId, orderId, itemId, body.status)
    return apiResponse(item)
  } catch (error) {
    return handleApiError(error)
  }
}
