/**
 * Invitation Token API Routes
 *
 * GET /api/team/invitations/[token] - Get invitation details by token
 * POST /api/team/invitations/[token] - Accept invitation
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TeamService } from "@/services"

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/team/invitations/[token]
 * Get invitation details (public - for invite page)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const invitation = await TeamService.getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired invitation" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: invitation,
    })
  } catch (error) {
    console.error("Failed to fetch invitation:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitation" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/team/invitations/[token]
 * Accept an invitation (requires authentication)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { token } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to accept an invitation" },
        { status: 401 }
      )
    }

    const result = await TeamService.acceptInvitation(token, session.user.id)

    return NextResponse.json({
      success: true,
      data: result,
      message: `You have joined ${result.tenantName}`,
    })
  } catch (error) {
    console.error("Failed to accept invitation:", error)
    const message = error instanceof Error ? error.message : "Failed to accept invitation"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
