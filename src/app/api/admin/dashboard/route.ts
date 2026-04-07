/**
 * Admin Dashboard API Route
 *
 * GET /api/admin/dashboard - Get platform dashboard data
 */

import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"

/**
 * GET /api/admin/dashboard
 * Get admin dashboard data (stats, recent tenants, recent payments)
 */
export async function GET() {
  try {
    await requireSystemAdmin()

    const data = await AdminService.getDashboardData()

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Failed to fetch admin dashboard:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
