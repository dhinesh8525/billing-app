/**
 * Party Search API Route
 *
 * GET /api/parties/search?q=query - Fast party search for autocomplete (tenant-scoped)
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { PartyService } from "@/services"
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
    const type = searchParams.get("type") || undefined
    const limit = parseInt(searchParams.get("limit") || "10")

    const parties = await PartyService.search(tenantId, query, type, Math.min(limit, 20))

    return apiResponse(parties)
  } catch (error) {
    return handleApiError(error)
  }
}
