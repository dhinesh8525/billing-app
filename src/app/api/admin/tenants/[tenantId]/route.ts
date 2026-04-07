/**
 * Admin Tenant Detail API Routes
 *
 * GET /api/admin/tenants/[tenantId] - Get tenant details
 * PATCH /api/admin/tenants/[tenantId] - Update tenant (status, subscription)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ tenantId: string }>
}

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  subscription: z
    .object({
      planId: z.string().optional(),
      status: z.string().optional(),
      currentPeriodEnd: z.string().optional(),
    })
    .optional(),
})

/**
 * GET /api/admin/tenants/[tenantId]
 * Get detailed tenant information
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireSystemAdmin()
    const { tenantId } = await params

    const tenant = await AdminService.getTenantDetails(tenantId)

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    })
  } catch (error) {
    console.error("Failed to fetch tenant:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch tenant"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

/**
 * PATCH /api/admin/tenants/[tenantId]
 * Update tenant status or subscription
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireSystemAdmin()
    const { tenantId } = await params

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { isActive, subscription } = validation.data

    // Update tenant status
    if (typeof isActive === "boolean") {
      await AdminService.setTenantStatus(tenantId, isActive)
    }

    // Update subscription
    if (subscription) {
      await AdminService.updateTenantSubscription(tenantId, {
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : undefined,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Tenant updated successfully",
    })
  } catch (error) {
    console.error("Failed to update tenant:", error)
    const message = error instanceof Error ? error.message : "Failed to update tenant"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
