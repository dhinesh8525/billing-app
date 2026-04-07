/**
 * Parties API Route
 *
 * GET /api/parties - List parties with filtering
 * POST /api/parties - Create a new party
 */

import { NextRequest } from "next/server"
import { PartyService } from "@/services"
import { createPartySchema, partyQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireAuth,
} from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, partyQuerySchema)
    const result = await PartyService.list(query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await parseBody(request, createPartySchema)
    const party = await PartyService.create(body)

    return apiResponse(party, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
