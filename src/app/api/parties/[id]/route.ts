/**
 * Party by ID API Route
 *
 * GET /api/parties/[id] - Get a party by ID
 * PUT /api/parties/[id] - Update a party
 * DELETE /api/parties/[id] - Delete a party
 */

import { NextRequest } from "next/server"
import { PartyService } from "@/services"
import { updatePartySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireAuth,
} from "@/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const party = await PartyService.getById(id)

    return apiResponse(party)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const body = await parseBody(request, updatePartySchema)
    const party = await PartyService.update(id, body)

    return apiResponse(party)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const result = await PartyService.delete(id)

    return apiResponse({ message: "Party deleted", party: result })
  } catch (error) {
    return handleApiError(error)
  }
}
