/**
 * Admin Plan Detail API Routes
 *
 * PUT /api/admin/plans/[planId] - Update a plan
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ planId: string }>
}

const updatePlanSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  price: z.number().min(0),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  features: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

/**
 * PUT /api/admin/plans/[planId]
 * Update a plan
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireSystemAdmin()
    const { planId } = await params

    const body = await request.json()
    const validation = updatePlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = await AdminService.upsertPlan(planId, validation.data)

    return NextResponse.json({
      success: true,
      data: plan,
      message: "Plan updated successfully",
    })
  } catch (error) {
    console.error("Failed to update plan:", error)
    const message = error instanceof Error ? error.message : "Failed to update plan"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
