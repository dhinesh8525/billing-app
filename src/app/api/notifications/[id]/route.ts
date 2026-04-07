/**
 * Single Notification API Routes
 *
 * PATCH /api/notifications/[id] - Mark notification as read
 * DELETE /api/notifications/[id] - Delete notification
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { AlertService } from "@/services/alert.service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/notifications/[id]
 * Mark a notification as read
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await AlertService.markAsRead(
      session.user.tenantId,
      session.user.id,
      id
    )

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    })
  } catch (error) {
    console.error("Failed to mark notification as read:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await AlertService.delete(
      session.user.tenantId,
      session.user.id,
      id
    )

    return NextResponse.json({
      success: true,
      message: "Notification deleted",
    })
  } catch (error) {
    console.error("Failed to delete notification:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
