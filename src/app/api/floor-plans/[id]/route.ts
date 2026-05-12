/**
 * Floor Plan by ID API Route
 *
 * GET /api/floor-plans/[id] - Get floor plan details
 * PUT /api/floor-plans/[id] - Update floor plan
 * DELETE /api/floor-plans/[id] - Delete floor plan
 */

import { NextRequest } from "next/server"
import { TableService } from "@/services"
import { updateFloorPlanSchema } from "@/validations"
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
    const floorPlan = await TableService.getFloorPlanById(tenantId, id)
    return apiResponse(floorPlan)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const body = await parseBody(request, updateFloorPlanSchema)
    const floorPlan = await TableService.updateFloorPlan(tenantId, id, body)
    return apiResponse(floorPlan)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    await TableService.deleteFloorPlan(tenantId, id)
    return apiResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
