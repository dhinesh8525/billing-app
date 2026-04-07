/**
 * Invitations API Routes
 *
 * GET /api/team/invitations - Get pending invitations
 * DELETE /api/team/invitations?id=xxx - Cancel an invitation
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TeamService } from "@/services"

/**
 * GET /api/team/invitations
 * Get all pending invitations
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const invitations = await TeamService.getPendingInvitations(
      session.user.tenantId
    )

    return NextResponse.json({
      success: true,
      data: invitations,
    })
  } catch (error) {
    console.error("Failed to fetch invitations:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/team/invitations?id=xxx
 * Cancel a pending invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only OWNER and ADMIN can cancel invitations
    if (!["OWNER", "ADMIN"].includes(session.user.tenantRole || "")) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to cancel invitations" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get("id")

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Invitation ID is required" },
        { status: 400 }
      )
    }

    await TeamService.cancelInvitation(session.user.tenantId, invitationId)

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled",
    })
  } catch (error) {
    console.error("Failed to cancel invitation:", error)
    const message = error instanceof Error ? error.message : "Failed to cancel invitation"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
