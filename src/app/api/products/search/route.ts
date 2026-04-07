/**
 * Product Search API Route
 *
 * GET /api/products/search?q=query - Fast product search for autocomplete
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import { apiResponse, handleApiError, requireAuth } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "10")

    const products = await ProductService.search(query, Math.min(limit, 20))

    return apiResponse(products)
  } catch (error) {
    return handleApiError(error)
  }
}
