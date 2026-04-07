/**
 * Dashboard API Route
 *
 * GET /api/dashboard - Get dashboard statistics (tenant-scoped)
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { BillingService, ProductService, PartyService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Fetch all dashboard data in parallel (all tenant-scoped)
    const [
      stats,
      lowStock,
      recentTransactions,
      receivables,
      payables,
      stockValue,
    ] = await Promise.all([
      BillingService.getDashboardStats(
        tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      ),
      ProductService.getLowStock(tenantId, 5),
      BillingService.getRecentTransactions(tenantId, 5),
      PartyService.getReceivables(tenantId, 5),
      PartyService.getPayables(tenantId, 5),
      ProductService.getStockValue(tenantId),
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
