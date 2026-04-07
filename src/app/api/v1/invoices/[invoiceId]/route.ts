/**
 * Public API - Single Invoice
 *
 * GET /api/v1/invoices/[invoiceId] - Get invoice details
 */

import { NextRequest } from "next/server"
import { authenticateApiRequest, apiSuccess, apiError } from "@/lib/api-auth"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ invoiceId: string }>
}

/**
 * GET /api/v1/invoices/[invoiceId]
 * Get a single invoice with items
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request, "read:invoices")
  if (!auth.success) return auth.response

  try {
    const { invoiceId } = await params

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId: auth.context.tenantId,
      },
      include: {
        items: true,
        party: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    })

    if (!invoice) {
      return apiError("NOT_FOUND", "Invoice not found", 404)
    }

    return apiSuccess({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      status: invoice.status,
      party: invoice.party,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      taxAmount: Number(invoice.taxAmount),
      discountPercent: Number(invoice.discountPercent),
      discountAmount: Number(invoice.discountAmount),
      roundOff: Number(invoice.roundOff),
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
      paymentMode: invoice.paymentMode,
      paymentStatus: invoice.paymentStatus,
      notes: invoice.notes,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        hsn: item.hsn,
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        discount: Number(item.discount),
        lineTotal: Number(item.lineTotal),
      })),
    })
  } catch (error) {
    console.error("API v1 invoice get error:", error)
    return apiError("INTERNAL_ERROR", "Failed to get invoice", 500)
  }
}
