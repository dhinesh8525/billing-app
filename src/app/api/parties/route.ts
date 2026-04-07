/**
 * Parties API Route
 *
 * GET /api/parties - List parties with filtering (tenant-scoped)
 * POST /api/parties - Create a new party (tenant-scoped)
 */

import { NextRequest } from "next/server"
import { PartyService } from "@/services"
import { createPartySchema, partyQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, partyQuerySchema)
    const result = await PartyService.list(tenantId, query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const body = await parseBody(request, createPartySchema)
    const party = await PartyService.create(tenantId, body)

    return apiResponse(party, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
