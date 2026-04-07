/**
 * Public API - Invoices
 *
 * GET /api/v1/invoices - List invoices
 * POST /api/v1/invoices - Create an invoice
 */

import { NextRequest } from "next/server"
import { authenticateApiRequest, apiSuccess, apiError, apiPaginated } from "@/lib/api-auth"
import { BillingService } from "@/services"
import { UsageService } from "@/services/usage.service"
import { prisma } from "@/lib/db"
import { z } from "zod"

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).optional(),
  type: z.enum(["SALE", "PURCHASE"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const createInvoiceSchema = z.object({
  type: z.enum(["SALE", "PURCHASE", "EXPENSE", "PAYMENT_IN", "PAYMENT_OUT"]).default("SALE"),
  partyId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0).optional(),
      discount: z.number().min(0).default(0),
    })
  ).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  paymentMode: z.enum(["cash", "upi", "card", "bank_transfer", "credit", "cheque"]).optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).default("COMPLETED"),
  amountPaid: z.number().min(0).default(0),
  isInterstate: z.boolean().default(false),
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

/**
 * GET /api/v1/invoices
 * List invoices with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "read:invoices")
  if (!auth.success) return auth.response

  try {
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 20,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    })

    const where: Record<string, unknown> = {
      tenantId: auth.context.tenantId,
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.type) {
      where.type = query.type
    }

    if (query.startDate || query.endDate) {
      where.invoiceDate = {}
      if (query.startDate) {
        (where.invoiceDate as Record<string, Date>).gte = new Date(query.startDate)
      }
      if (query.endDate) {
        (where.invoiceDate as Record<string, Date>).lte = new Date(query.endDate)
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          total: true,
          paymentStatus: true,
          invoiceDate: true,
          createdAt: true,
          party: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    const data = invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      total: Number(inv.total),
    }))

    return apiPaginated(data, {
      page: query.page,
      pageSize: query.pageSize,
      total,
    })
  } catch (error) {
    console.error("API v1 invoices list error:", error)
    return apiError("INTERNAL_ERROR", "Failed to list invoices", 500)
  }
}

/**
 * POST /api/v1/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "write:invoices")
  if (!auth.success) return auth.response

  try {
    // Check usage limits
    const canCreate = await UsageService.canPerformAction(auth.context.tenantId, "INVOICES")
    if (!canCreate.allowed) {
      return apiError("LIMIT_EXCEEDED", canCreate.reason || "Invoice limit reached", 403)
    }

    const body = await request.json()
    const validation = createInvoiceSchema.safeParse(body)

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400
      )
    }

    // Get a system user for API-created invoices
    // In production, you might want to create a special API user
    const systemUser = await prisma.user.findFirst({
      where: {
        memberships: {
          some: { tenantId: auth.context.tenantId },
        },
      },
    })

    if (!systemUser) {
      return apiError("CONFIGURATION_ERROR", "No user found for this workspace", 500)
    }

    const invoice = await BillingService.createInvoice(
      auth.context.tenantId,
      validation.data,
      systemUser.id
    )

    // Track usage
    await UsageService.incrementUsage(auth.context.tenantId, "INVOICES")

    return apiSuccess(
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        status: invoice.status,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        discountAmount: Number(invoice.discountAmount),
        total: Number(invoice.total),
        paymentStatus: invoice.paymentStatus,
        invoiceDate: invoice.invoiceDate,
        createdAt: invoice.createdAt,
        items: invoice.items?.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxAmount: Number(item.taxAmount),
          lineTotal: Number(item.lineTotal),
        })),
      },
      201
    )
  } catch (error) {
    console.error("API v1 invoice create error:", error)

    if (error instanceof Error) {
      if (error.message.includes("stock")) {
        return apiError("INSUFFICIENT_STOCK", error.message, 400)
      }
      if (error.message.includes("not found")) {
        return apiError("NOT_FOUND", error.message, 404)
      }
    }

    return apiError("INTERNAL_ERROR", "Failed to create invoice", 500)
  }
}
