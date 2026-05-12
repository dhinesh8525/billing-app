/**
 * Convert Order to Invoice API Route
 *
 * POST /api/orders/[id]/convert - Convert order to invoice
 */

import { NextRequest } from "next/server"
import { OrderService } from "@/services"
import { convertToInvoiceSchema } from "@/validations"
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
    const body = await parseBody(request, convertToInvoiceSchema)
    const invoice = await OrderService.convertToInvoice(tenantId, id, body, userId)
    return apiResponse(invoice, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
