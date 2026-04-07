/**
 * Dashboard API Route
 *
 * GET /api/dashboard - Get dashboard statistics
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { BillingService, ProductService, PartyService } from "@/services"
import { apiResponse, handleApiError, requireAuth } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Fetch all dashboard data in parallel
    const [
      stats,
      lowStock,
      recentTransactions,
      receivables,
      payables,
      stockValue,
    ] = await Promise.all([
      BillingService.getDashboardStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      ),
      ProductService.getLowStock(5),
      BillingService.getRecentTransactions(5),
      PartyService.getReceivables(5),
      PartyService.getPayables(5),
      ProductService.getStockValue(),
    ])

    return apiResponse({
      stats: {
        ...stats,
        stockValue,
      },
      lowStock,
      recentTransactions,
      receivables,
      payables,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
