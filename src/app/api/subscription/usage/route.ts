/**
 * Usage API Route
 *
 * GET /api/subscription/usage - Get current usage and limits
 */

export const dynamic = "force-dynamic"

import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { getUsageSummary } from "@/lib/feature-gate"

export async function GET() {
  try {
    const { tenantId } = await requireTenant()

    const usage = await getUsageSummary(tenantId)

    if (!usage) {
      return apiResponse({
        error: "No subscription found",
      }, 404)
    }

    return apiResponse(usage)
  } catch (error) {
    return handleApiError(error)
  }
}
