/**
 * Table Positions API Route
 *
 * PUT /api/tables/positions - Bulk update table positions (for drag-drop editor)
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { TableService } from "@/services"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

const updatePositionsSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().cuid(),
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
    })
  ).min(1),
})

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await parseBody(request, updatePositionsSchema)
    await TableService.updateTablePositions(tenantId, body.updates)
    return apiResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
