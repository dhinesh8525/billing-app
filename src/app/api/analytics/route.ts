/**
 * Analytics API
 *
 * GET /api/analytics - Get analytics dashboard data
 * GET /api/analytics?type=sales&period=month - Get specific analytics
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AnalyticsService } from "@/services/analytics.service"
import { UsageService } from "@/services/usage.service"

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
    const type = searchParams.get("type") || "dashboard"
    const period = searchParams.get("period") || "month"

    let data

    switch (type) {
      case "sales":
        data = await AnalyticsService.getSalesAnalytics(tenantId, period)
        break

      case "inventory":
        data = await AnalyticsService.getInventoryAnalytics(tenantId)
        break

      case "growth":
        data = await AnalyticsService.getGrowthAnalytics(tenantId, period)
        break

      case "tax":
        data = await AnalyticsService.getTaxSummary(tenantId, period)
        break

      case "usage":
        data = await UsageService.getUsageSummary(tenantId)
        break

      case "dashboard":
      default:
        data = await AnalyticsService.getDashboardSummary(tenantId)
        break
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
