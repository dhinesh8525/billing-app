/**
 * Party by ID API Route
 *
 * GET /api/parties/[id] - Get a party by ID (tenant-scoped)
 * PUT /api/parties/[id] - Update a party (tenant-scoped)
 * DELETE /api/parties/[id] - Delete a party (tenant-scoped, admin only)
 */

import { NextRequest } from "next/server"
import { PartyService } from "@/services"
import { updatePartySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
  requireTenantAdmin,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params

    const party = await PartyService.getById(tenantId, id)

    return apiResponse(party)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params

    const body = await parseBody(request, updatePartySchema)
    const party = await PartyService.update(tenantId, id, body)

    return apiResponse(party)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenantAdmin()
    const { id } = await params

    const result = await PartyService.delete(tenantId, id)

    return apiResponse({ message: "Party deleted", party: result })
  } catch (error) {
    return handleApiError(error)
  }
}
