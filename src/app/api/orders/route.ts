/**
 * Orders API Route
 *
 * GET /api/orders - List orders with filtering
 * POST /api/orders - Create a new order
 */

import { NextRequest } from "next/server"
import { OrderService } from "@/services"
import { createOrderSchema, orderQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, orderQuerySchema)
    const result = await OrderService.listOrders(tenantId, query)
    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()
    const body = await parseBody(request, createOrderSchema)
    const order = await OrderService.createOrder(tenantId, body, userId)
    return apiResponse(order, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
