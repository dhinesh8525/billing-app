/**
 * Order Items API Route
 *
 * POST /api/orders/[id]/items - Add items to an existing order
 */

import { NextRequest } from "next/server"
import { OrderService } from "@/services"
import { addOrderItemsSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, userId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, addOrderItemsSchema)
    const order = await OrderService.addOrderItems(tenantId, id, body, userId)
    return apiResponse(order, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
