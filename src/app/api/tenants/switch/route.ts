/**
 * Tenant Switch API Route
 *
 * POST /api/tenants/switch - Switch to a different tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TenantService } from "@/services"
import { z } from "zod"

const switchSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
})

/**
 * POST /api/tenants/switch
 * Switch the user's active tenant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = switchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    await TenantService.switchTenant(session.user.id, validation.data.tenantId)

    return NextResponse.json({
      success: true,
      message: "Workspace switched successfully",
    })
  } catch (error) {
    console.error("Failed to switch tenant:", error)
    const message = error instanceof Error ? error.message : "Failed to switch workspace"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
