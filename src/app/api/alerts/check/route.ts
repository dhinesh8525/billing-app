/**
 * Alert Check API
 *
 * POST /api/alerts/check - Run alert checks for the current tenant
 *
 * This can be called manually or via a scheduled job.
 */

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { AlertService } from "@/services/alert.service"

export async function POST() {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only allow admins/owners to run checks
    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId

    // Run all alert checks
    const [lowStockCount, paymentDueCount] = await Promise.all([
      AlertService.checkLowStock(tenantId),
      AlertService.checkPaymentDue(tenantId),
    ])

    // Clean up old alerts
    await AlertService.cleanup(tenantId)

    return NextResponse.json({
      success: true,
      data: {
        lowStockAlerts: lowStockCount,
        paymentDueAlerts: paymentDueCount,
        total: lowStockCount + paymentDueCount,
      },
      message: `Created ${lowStockCount + paymentDueCount} new alerts`,
    })
  } catch (error) {
    console.error("Alert check error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to run alert checks" },
      { status: 500 }
    )
  }
}
