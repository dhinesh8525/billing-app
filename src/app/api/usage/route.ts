/**
 * Usage API
 *
 * GET /api/usage - Get usage summary for current tenant
 * GET /api/usage/check?metric=INVOICES - Check if action is allowed
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UsageService, type UsageMetric } from "@/services/usage.service"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "No workspace selected" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get("metric") as UsageMetric | null

    // Check specific action
    if (metric) {
      const result = await UsageService.canPerformAction(tenantId, metric)
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    // Get full summary
    const [summary, limits] = await Promise.all([
      UsageService.getUsageSummary(tenantId),
      UsageService.getPlanLimits(tenantId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        usage: summary,
        limits,
      },
    })
  } catch (error) {
    console.error("Usage API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch usage data" },
      { status: 500 }
    )
  }
}
