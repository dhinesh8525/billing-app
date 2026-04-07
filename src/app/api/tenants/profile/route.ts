/**
 * Tenant Profile API Routes
 *
 * GET /api/tenants/profile - Get current tenant profile
 * PUT /api/tenants/profile - Update current tenant profile
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { TenantService } from "@/services"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
})

/**
 * GET /api/tenants/profile
 * Get current tenant's profile
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

    const [profile, stats] = await Promise.all([
      TenantService.getProfile(session.user.tenantId),
      TenantService.getStats(session.user.tenantId),
    ])

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        stats,
      },
    })
  } catch (error) {
    console.error("Failed to fetch tenant profile:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspace profile" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tenants/profile
 * Update current tenant's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only OWNER and ADMIN can update profile
    if (!["OWNER", "ADMIN"].includes(session.user.tenantRole || "")) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to update workspace settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const profile = await TenantService.updateProfile(
      session.user.tenantId,
      validation.data
    )

    return NextResponse.json({
      success: true,
      data: profile,
      message: "Workspace profile updated",
    })
  } catch (error) {
    console.error("Failed to update tenant profile:", error)
    const message = error instanceof Error ? error.message : "Failed to update workspace profile"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
