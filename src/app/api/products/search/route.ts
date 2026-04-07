/**
 * Product Search API Route
 *
 * GET /api/products/search?q=query - Fast product search for autocomplete (tenant-scoped)
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "10")

    const products = await ProductService.search(tenantId, query, Math.min(limit, 20))

    return apiResponse(products)
  } catch (error) {
    return handleApiError(error)
  }
}
