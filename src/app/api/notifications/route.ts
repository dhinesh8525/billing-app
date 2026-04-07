/**
 * Notifications API Routes
 *
 * GET /api/notifications - List notifications for current user
 * POST /api/notifications/mark-read - Mark notifications as read
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { AlertService } from "@/services/alert.service"
import { z } from "zod"

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
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
    const query = listQuerySchema.parse({
      limit: searchParams.get("limit") || 20,
      offset: searchParams.get("offset") || 0,
      unreadOnly: searchParams.get("unreadOnly") || undefined,
    })

    const result = await AlertService.getForUser(
      session.user.tenantId,
      session.user.id,
      {
        limit: query.limit,
        offset: query.offset,
        isRead: query.unreadOnly ? false : undefined,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        notifications: result.alerts.map((alert) => ({
          id: alert.id,
          type: alert.type,
          title: alert.title,
          message: alert.message,
          data: alert.data,
          priority: alert.priority,
          isRead: alert.isRead,
          createdAt: alert.createdAt,
        })),
        total: result.total,
        unreadCount: result.unreadCount,
      },
    })
  } catch (error) {
    console.error("Failed to get notifications:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get notifications" },
      { status: 500 }
    )
  }
}
