/**
 * Payments API Route
 *
 * GET /api/payments - Get payment history for the tenant
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { RazorpayService } from "@/services/razorpay.service"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status") || undefined

    const payments = await RazorpayService.getPaymentsByTenant(tenantId, {
      page,
      pageSize,
      status,
    })

    return apiResponse(payments)
  } catch (error) {
    return handleApiError(error)
  }
}
