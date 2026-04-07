/**
 * Invoices API Route
 *
 * GET /api/invoices - List invoices with filtering (tenant-scoped)
 * POST /api/invoices - Create a new invoice (tenant-scoped)
 */

import { NextRequest } from "next/server"
import { BillingService } from "@/services"
import { createInvoiceSchema, invoiceQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { UsageService } from "@/services/usage.service"
import { AlertService } from "@/services/alert.service"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, invoiceQuerySchema)
    const result = await BillingService.list(tenantId, query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()

    // Check usage limits before creating
    const canCreate = await UsageService.canPerformAction(tenantId, "INVOICES")
    if (!canCreate.allowed) {
      return apiResponse({ error: canCreate.reason }, 403)
    }

    const body = await parseBody(request, createInvoiceSchema)
    const invoice = await BillingService.createInvoice(tenantId, body, userId)

    // Track usage
    await UsageService.incrementUsage(tenantId, "INVOICES")

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId,
      userId,
      action: "CREATE",
      entityType: "INVOICE",
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        itemCount: invoice.items?.length || 0,
      },
      ipAddress,
      userAgent,
    })

    // Create notification and check for low stock (non-blocking)
    Promise.all([
      AlertService.alertInvoiceCreated(tenantId, {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        customerName: invoice.customerName,
        type: invoice.type,
      }),
      AlertService.checkLowStock(tenantId),
    ]).catch((err) => console.error("Alert creation failed:", err))

    return apiResponse(invoice, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
