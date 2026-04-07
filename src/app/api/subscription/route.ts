/**
 * Subscription API Route
 *
 * GET /api/subscription - Get current tenant's subscription
 * POST /api/subscription - Create/change subscription (for Razorpay callback)
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { SubscriptionService, PlanService } from "@/services"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
  requireTenantOwner,
} from "@/lib/api-utils-tenant"
import { getUsageSummary } from "@/lib/feature-gate"

const changeSubscriptionSchema = z.object({
  planId: z.string(),
  razorpaySubscriptionId: z.string().optional(),
  razorpayCustomerId: z.string().optional(),
})

export async function GET() {
  try {
    const { tenantId } = await requireTenant()

    // Get subscription with status details
    const statusDetails = await SubscriptionService.getStatusDetails(tenantId)

    if (!statusDetails) {
      return apiResponse({
        subscription: null,
        usage: null,
      })
    }

    // Get usage summary
    const usage = await getUsageSummary(tenantId)

    return apiResponse({
      subscription: statusDetails,
      usage,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only tenant owners can change subscription
    const { tenantId } = await requireTenantOwner()

    const body = await parseBody(request, changeSubscriptionSchema)

    // Verify plan exists
    const plan = await PlanService.getById(body.planId)
    if (!plan) {
      throw new Error("Plan not found")
    }

    // Check if tenant already has a subscription
    const existing = await SubscriptionService.getByTenantId(tenantId)

    let subscription

    if (existing) {
      // Change existing subscription
      subscription = await SubscriptionService.changePlan(tenantId, body.planId, {
        immediate: true,
        razorpaySubscriptionId: body.razorpaySubscriptionId,
      })
    } else {
      // Create new subscription
      subscription = await SubscriptionService.create(tenantId, body.planId, {
        razorpaySubscriptionId: body.razorpaySubscriptionId,
        razorpayCustomerId: body.razorpayCustomerId,
      })
    }

    return apiResponse(subscription, existing ? 200 : 201)
  } catch (error) {
    return handleApiError(error)
  }
}
