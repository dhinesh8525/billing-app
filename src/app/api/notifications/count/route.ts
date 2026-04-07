/**
 * Notification Count API
 *
 * GET /api/notifications/count - Get unread notification count
 */

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { AlertService } from "@/services/alert.service"

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const count = await AlertService.getUnreadCount(
      session.user.tenantId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: { count },
    })
  } catch (error) {
    console.error("Failed to get notification count:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get count" },
      { status: 500 }
    )
  }
}
