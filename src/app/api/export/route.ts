/**
 * Export API Routes
 *
 * GET /api/export?type=products|invoices|invoice-items|parties|gst|hsn
 * Returns CSV data for download
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { ExportService } from "@/services/export.service"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { z } from "zod"

const querySchema = z.object({
  type: z.enum(["products", "invoices", "invoice-items", "parties", "gst", "hsn"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  partyType: z.enum(["CUSTOMER", "SUPPLIER"]).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const validation = querySchema.safeParse({
      type: searchParams.get("type"),
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
      partyType: searchParams.get("partyType") || undefined,
    })

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid export type" },
        { status: 400 }
      )
    }

    const { type, startDate, endDate, status, partyType } = validation.data
    const tenantId = session.user.tenantId

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    }

    let csv: string
    let filename: string

    switch (type) {
      case "products":
        csv = await ExportService.exportProducts(tenantId)
        filename = `products-${new Date().toISOString().split("T")[0]}.csv`
        break

      case "invoices":
        csv = await ExportService.exportInvoices(tenantId, options)
        filename = `invoices-${new Date().toISOString().split("T")[0]}.csv`
        break

      case "invoice-items":
        csv = await ExportService.exportInvoiceItems(tenantId, options)
        filename = `invoice-items-${new Date().toISOString().split("T")[0]}.csv`
        break

      case "parties":
        csv = await ExportService.exportParties(tenantId, partyType)
        filename = `parties-${partyType?.toLowerCase() || "all"}-${new Date().toISOString().split("T")[0]}.csv`
        break

      case "gst":
        csv = await ExportService.exportGSTReport(tenantId, options)
        filename = `gst-report-${new Date().toISOString().split("T")[0]}.csv`
        break

      case "hsn":
        csv = await ExportService.exportHSNSummary(tenantId, options)
        filename = `hsn-summary-${new Date().toISOString().split("T")[0]}.csv`
        break

      default:
        return NextResponse.json(
          { success: false, error: "Invalid export type" },
          { status: 400 }
        )
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId,
      userId: session.user.id,
      action: "EXPORT",
      entityType: "SETTINGS",
      entityId: type,
      metadata: {
        exportType: type,
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || null,
        partyType: partyType || null,
      },
      ipAddress,
      userAgent,
    })

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate export" },
      { status: 500 }
    )
  }
}
