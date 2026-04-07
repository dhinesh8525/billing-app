/**
 * Mark All Notifications as Read
 *
 * POST /api/notifications/mark-all-read
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

    await AlertService.markAllAsRead(
      session.user.tenantId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    )
  }
}
