/**
 * Team API Routes
 *
 * GET /api/team - List team members and pending invitations
 * POST /api/team - Invite a new team member
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TeamService } from "@/services"
import { z } from "zod"

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

/**
 * GET /api/team
 * List all team members and pending invitations
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

    const [members, invitations] = await Promise.all([
      TeamService.getMembers(session.user.tenantId),
      TeamService.getPendingInvitations(session.user.tenantId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        members,
        invitations,
        currentUserId: session.user.id,
        currentUserRole: session.user.tenantRole,
      },
    })
  } catch (error) {
    console.error("Failed to fetch team:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch team" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/team
 * Invite a new team member
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only OWNER and ADMIN can invite
    if (!["OWNER", "ADMIN"].includes(session.user.tenantRole || "")) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to invite members" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = inviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, role } = validation.data

    // Only OWNER can invite ADMINs
    if (role === "ADMIN" && session.user.tenantRole !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Only the owner can invite admins" },
        { status: 403 }
      )
    }

    const invitation = await TeamService.createInvitation(
      session.user.tenantId,
      email.toLowerCase(),
      role,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: invitation,
      message: `Invitation sent to ${email}`,
    })
  } catch (error) {
    console.error("Failed to create invitation:", error)
    const message = error instanceof Error ? error.message : "Failed to create invitation"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
