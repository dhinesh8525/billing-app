/**
 * Settings API Route
 *
 * GET /api/settings - Get all settings (tenant-scoped)
 * PUT /api/settings - Update settings (tenant-scoped, admin only)
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { SettingsService } from "@/services"
import { appSettingsSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  requireTenant,
  requireTenantAdmin,
} from "@/lib/api-utils-tenant"

export async function GET() {
  try {
    const { tenantId } = await requireTenant()

    const settings = await SettingsService.getAll(tenantId)

    return apiResponse(settings)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Only tenant admins can update settings
    const { tenantId } = await requireTenantAdmin()

    const body = await request.json()
    const validated = appSettingsSchema.partial().parse(body)
    const settings = await SettingsService.updateAll(tenantId, validated)

    return apiResponse(settings)
  } catch (error) {
    return handleApiError(error)
  }
}
