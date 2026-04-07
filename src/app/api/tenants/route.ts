/**
 * Tenants API Routes
 *
 * GET /api/tenants - Get all tenants user belongs to
 * POST /api/tenants - Create a new tenant/workspace
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TenantService } from "@/services"
import { z } from "zod"

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

/**
 * GET /api/tenants
 * Get all tenants the current user belongs to
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenants = await TenantService.getUserTenants(session.user.id)

    return NextResponse.json({
      success: true,
      data: tenants,
      currentTenantId: session.user.tenantId,
    })
  } catch (error) {
    console.error("Failed to fetch tenants:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspaces" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tenants
 * Create a new tenant/workspace
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
    const validation = createTenantSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const tenant = await TenantService.createTenant(
      session.user.id,
      validation.data
    )

    return NextResponse.json({
      success: true,
      data: tenant,
      message: "Workspace created successfully",
    })
  } catch (error) {
    console.error("Failed to create tenant:", error)
    const message = error instanceof Error ? error.message : "Failed to create workspace"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
