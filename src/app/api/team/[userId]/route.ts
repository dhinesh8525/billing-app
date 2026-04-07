/**
 * Team Member API Routes
 *
 * PATCH /api/team/[userId] - Update member role
 * DELETE /api/team/[userId] - Remove member from team
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TeamService } from "@/services"
import { z } from "zod"

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

interface RouteParams {
  params: Promise<{ userId: string }>
}

/**
 * PATCH /api/team/[userId]
 * Update a team member's role
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { userId } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const member = await TeamService.updateMemberRole(
      session.user.tenantId,
      userId,
      validation.data.role,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: member,
      message: "Member role updated",
    })
  } catch (error) {
    console.error("Failed to update member role:", error)
    const message = error instanceof Error ? error.message : "Failed to update role"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/team/[userId]
 * Remove a member from the team
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { userId } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await TeamService.removeMember(
      session.user.tenantId,
      userId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      message: "Member removed from team",
    })
  } catch (error) {
    console.error("Failed to remove member:", error)
    const message = error instanceof Error ? error.message : "Failed to remove member"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
