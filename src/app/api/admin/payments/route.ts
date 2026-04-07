/**
 * Admin Payments API Route
 *
 * GET /api/admin/payments - List recent payments across all tenants
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"

/**
 * GET /api/admin/payments
 * List recent payments across all tenants
 */
export async function GET(request: NextRequest) {
  try {
    await requireSystemAdmin()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    const payments = await AdminService.getRecentPayments(limit)

    return NextResponse.json({
      success: true,
      data: payments,
    })
  } catch (error) {
    console.error("Failed to fetch payments:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch payments"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
