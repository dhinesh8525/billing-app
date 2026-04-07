/**
 * Admin Plans API Routes
 *
 * GET /api/admin/plans - List all plans
 * POST /api/admin/plans - Create a new plan
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"
import { z } from "zod"

const createPlanSchema = z.object({
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
 * GET /api/admin/plans
 * List all plans with subscriber counts
 */
export async function GET() {
  try {
    await requireSystemAdmin()

    const plans = await AdminService.listPlans()

    return NextResponse.json({
      success: true,
      data: plans,
    })
  } catch (error) {
    console.error("Failed to fetch plans:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch plans"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

/**
 * POST /api/admin/plans
 * Create a new plan
 */
export async function POST(request: NextRequest) {
  try {
    await requireSystemAdmin()

    const body = await request.json()
    const validation = createPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const plan = await AdminService.upsertPlan(null, validation.data)

    return NextResponse.json({
      success: true,
      data: plan,
      message: "Plan created successfully",
    })
  } catch (error) {
    console.error("Failed to create plan:", error)
    const message = error instanceof Error ? error.message : "Failed to create plan"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
