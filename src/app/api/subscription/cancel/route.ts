/**
 * Cancel Subscription API Route
 *
 * POST /api/subscription/cancel - Cancel the current subscription
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { SubscriptionService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenantOwner,
} from "@/lib/api-utils-tenant"

const cancelSchema = z.object({
  immediate: z.boolean().optional().default(false),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Only tenant owners can cancel subscription
    const { tenantId } = await requireTenantOwner()

    const body = await request.json()
    const { immediate, reason } = cancelSchema.parse(body)

    const subscription = await SubscriptionService.cancel(tenantId, {
      immediate,
      reason,
    })

    return apiResponse({
      message: immediate
        ? "Subscription cancelled and downgraded to free plan"
        : "Subscription will be cancelled at the end of the billing period",
      subscription,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
