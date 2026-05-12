/**
 * Table by ID API Route
 *
 * GET /api/tables/[id] - Get table details
 * PUT /api/tables/[id] - Update table
 * PATCH /api/tables/[id] - Update table status
 * DELETE /api/tables/[id] - Delete table
 */

import { NextRequest } from "next/server"
import { TableService } from "@/services"
import { updateTableSchema, updateTableStatusSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const table = await TableService.getTableById(tenantId, id)
    return apiResponse(table)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, updateTableSchema)
    const table = await TableService.updateTable(tenantId, id, body)
    return apiResponse(table)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, updateTableStatusSchema)
    const table = await TableService.updateTableStatus(tenantId, id, body.status)
    return apiResponse(table)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    await TableService.deleteTable(tenantId, id)
    return apiResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
