/**
 * Invoices API Route
 *
 * GET /api/invoices - List invoices with filtering
 * POST /api/invoices - Create a new invoice
 */

import { NextRequest } from "next/server"
import { BillingService } from "@/services"
import { createInvoiceSchema, invoiceQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireAuth,
} from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, invoiceQuerySchema)
    const result = await BillingService.list(query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await parseBody(request, createInvoiceSchema)
    const invoice = await BillingService.createInvoice(body, session.user.id)

    return apiResponse(invoice, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
