/**
 * Invoice PDF API Route
 *
 * GET /api/invoices/[id]/pdf - Get invoice HTML for PDF generation
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { PDFService } from "@/services/pdf.service"
import { AuditService, getRequestContext } from "@/services/audit.service"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId

    // Get invoice data
    const invoiceData = await PDFService.getInvoiceData(tenantId, id)

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check if HTML format is requested (for print/PDF)
    const format = request.nextUrl.searchParams.get("format")

    if (format === "html") {
      // Generate HTML for PDF conversion on client
      const html = PDFService.generateInvoiceHTML(invoiceData)

      // Log audit event
      const { ipAddress, userAgent } = getRequestContext(request)
      await AuditService.log({
        tenantId,
        userId: session.user.id,
        action: "EXPORT",
        entityType: "INVOICE",
        entityId: id,
        metadata: {
          type: "pdf",
          invoiceNumber: invoiceData.invoice.invoiceNumber,
        },
        ipAddress,
        userAgent,
      })

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      })
    }

    // Return JSON data for custom rendering
    return NextResponse.json({
      success: true,
      data: invoiceData,
    })
  } catch (error) {
    console.error("Invoice PDF error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate invoice PDF" },
      { status: 500 }
    )
  }
}
