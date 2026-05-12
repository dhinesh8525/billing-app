/**
 * KDS Configuration API Route
 *
 * GET /api/kds/config - Get KDS configuration
 * PUT /api/kds/config - Update KDS configuration
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { KDSService } from "@/services/kds.service"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

const updateConfigSchema = z.object({
  enableSound: z.boolean().optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
  groupByTable: z.boolean().optional(),
  printOnCreate: z.boolean().optional(),
  autoComplete: z.number().int().min(0).optional(),
})

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const config = await KDSService.getConfig(tenantId)
    return apiResponse(config)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await parseBody(request, updateConfigSchema)
    const config = await KDSService.updateConfig(tenantId, body)
    return apiResponse(config)
  } catch (error) {
    return handleApiError(error)
  }
}
