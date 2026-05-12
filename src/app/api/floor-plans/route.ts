/**
 * Floor Plans API Route
 *
 * GET /api/floor-plans - List floor plans
 * POST /api/floor-plans - Create a new floor plan
 */

import { NextRequest } from "next/server"
import { TableService } from "@/services"
import { createFloorPlanSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const floorPlans = await TableService.listFloorPlans(tenantId)
    return apiResponse(floorPlans)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await parseBody(request, createFloorPlanSchema)
    const floorPlan = await TableService.createFloorPlan(tenantId, body)
    return apiResponse(floorPlan, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
