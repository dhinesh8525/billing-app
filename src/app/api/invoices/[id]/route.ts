/**
 * Invoice by ID API Route
 *
 * GET /api/invoices/[id] - Get an invoice by ID (tenant-scoped)
 * PATCH /api/invoices/[id] - Update invoice (cancel, record payment) (tenant-scoped)
 */

import { NextRequest } from "next/server"
import { BillingService } from "@/services"
import { recordPaymentSchema, updateInvoiceStatusSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params

    const invoice = await BillingService.getById(tenantId, id)

    return apiResponse(invoice)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, userId } = await requireTenant()
    const { id } = await params

    const body = await request.json()

    // Handle cancel action
    if (body.action === "cancel") {
      const invoice = await BillingService.cancel(tenantId, id, userId)
      return apiResponse({ message: "Invoice cancelled", invoice })
    }

    // Handle payment recording
    if (body.action === "payment") {
      const payment = recordPaymentSchema.parse(body)
      const invoice = await BillingService.recordPayment(
        tenantId,
        id,
        payment.amount,
        payment.paymentMode
      )
      return apiResponse({ message: "Payment recorded", invoice })
    }

    // Handle status update
    const statusUpdate = updateInvoiceStatusSchema.parse(body)
    // For now, only cancel is supported through status
    if (statusUpdate.status === "CANCELLED") {
      const invoice = await BillingService.cancel(tenantId, id, userId)
      return apiResponse({ message: "Invoice cancelled", invoice })
    }

    return apiResponse({ message: "No action taken" })
  } catch (error) {
    return handleApiError(error)
  }
}
