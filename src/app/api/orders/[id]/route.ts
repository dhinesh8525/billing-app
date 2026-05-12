/**
 * Order by ID API Route
 *
 * GET /api/orders/[id] - Get order details
 * PUT /api/orders/[id] - Update order
 * DELETE /api/orders/[id] - Cancel order
 */

import { NextRequest } from "next/server"
import { OrderService } from "@/services"
import { updateOrderSchema } from "@/validations"
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
    const order = await OrderService.getOrderById(tenantId, id)
    return apiResponse(order)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, updateOrderSchema)
    const order = await OrderService.updateOrder(tenantId, id, body)
    return apiResponse(order)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const order = await OrderService.cancelOrder(tenantId, id, body.reason)
    return apiResponse(order)
  } catch (error) {
    return handleApiError(error)
  }
}
