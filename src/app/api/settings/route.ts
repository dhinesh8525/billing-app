/**
 * Settings API Route
 *
 * GET /api/settings - Get all settings
 * PUT /api/settings - Update settings
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { SettingsService } from "@/services"
import { appSettingsSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  requireAuth,
  requireAdminAuth,
} from "@/lib/api-utils"

export async function GET() {
  try {
    await requireAuth()

    const settings = await SettingsService.getAll()

    return apiResponse(settings)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Only admins can update settings
    await requireAdminAuth()

    const body = await request.json()
    const validated = appSettingsSchema.partial().parse(body)
    const settings = await SettingsService.updateAll(validated)

    return apiResponse(settings)
  } catch (error) {
    return handleApiError(error)
  }
}
