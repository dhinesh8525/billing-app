/**
 * Invoice Share API Route
 *
 * POST /api/invoices/[id]/share - Share invoice via email or generate share link
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const shareSchema = z.object({
  email: z.string().email().optional(),
  method: z.enum(["email", "link", "whatsapp"]),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = shareSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, method } = validation.data
    const tenantId = session.user.tenantId

    // Verify invoice exists and belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { party: true },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Generate share URL
    // In production, you would generate a secure token
    const baseUrl = request.nextUrl.origin
    const shareUrl = `${baseUrl}/invoices/${id}/view`

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "INVOICE",
      entityId: id,
      metadata: {
        action: "shared",
        method,
        recipient: email || "link_generated",
        invoiceNumber: invoice.invoiceNumber,
      },
      ipAddress,
      userAgent,
    })

    if (method === "email" && email) {
      // In production, integrate with email service (SendGrid, Resend, etc.)
      // For now, return success with the share link
      return NextResponse.json({
        success: true,
        message: `Invoice would be sent to ${email}`,
        data: {
          shareUrl,
          invoiceNumber: invoice.invoiceNumber,
        },
      })
    }

    if (method === "whatsapp") {
      const customerPhone = invoice.party?.phone || invoice.customerPhone
      const message = encodeURIComponent(
        `Invoice #${invoice.invoiceNumber}\nAmount: ₹${Number(invoice.total).toLocaleString("en-IN")}\nView: ${shareUrl}`
      )
      const whatsappUrl = customerPhone
        ? `https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${message}`
        : `https://wa.me/?text=${message}`

      return NextResponse.json({
        success: true,
        data: {
          shareUrl,
          whatsappUrl,
          invoiceNumber: invoice.invoiceNumber,
        },
      })
    }

    // Return share link
    return NextResponse.json({
      success: true,
      data: {
        shareUrl,
        invoiceNumber: invoice.invoiceNumber,
      },
    })
  } catch (error) {
    console.error("Invoice share error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to share invoice" },
      { status: 500 }
    )
  }
}
