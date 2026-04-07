/**
 * Subscription Checkout API
 *
 * POST /api/checkout/subscription - Create a Razorpay subscription for checkout
 *
 * Creates a new subscription in Razorpay and returns the subscription details
 * for frontend checkout flow.
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { z } from "zod"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { PlanService } from "@/services/plan.service"
import { SubscriptionService } from "@/services/subscription.service"
import { RazorpayService } from "@/services/razorpay.service"
import { getRazorpayKeyId } from "@/lib/razorpay"
import { prisma } from "@/lib/db"

const createCheckoutSchema = z.object({
  planId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenantName } = await requireTenant()

    // Get tenant details for email
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { email: true },
    })

    // Check if Razorpay is configured
    if (!RazorpayService.isAvailable()) {
      return apiResponse(
        { error: "Payment gateway not configured" },
        503
      )
    }

    // Parse and validate request
    const body = await request.json()
    const { planId } = createCheckoutSchema.parse(body)

    // Get plan details
    const plan = await PlanService.getById(planId)
    if (!plan || !plan.isActive) {
      return apiResponse({ error: "Plan not found" }, 404)
    }

    // Check if trying to subscribe to free plan
    if (plan.price === 0) {
      // For free plan, just create/update subscription directly
      const subscription = await SubscriptionService.create(tenantId, planId)
      await SubscriptionService.activate(tenantId, {
        razorpaySubscriptionId: "",
        periodMonths: plan.billingInterval === "YEARLY" ? 12 : 1,
      })

      return apiResponse({
        success: true,
        message: "Free plan activated",
        subscription,
      })
    }

    // Get current subscription
    const currentSubscription = await SubscriptionService.getByTenantId(tenantId)

    // If already on a paid plan, create upgrade order instead
    if (
      currentSubscription &&
      currentSubscription.status === "ACTIVE" &&
      currentSubscription.plan.price > 0
    ) {
      // Check if upgrading or downgrading
      if (plan.price <= currentSubscription.plan.price) {
        // Downgrade - schedule for next billing cycle
        await SubscriptionService.changePlan(tenantId, planId)
        return apiResponse({
          success: true,
          message: "Plan will change at the end of current billing period",
          scheduledPlanId: planId,
        })
      }

      // Upgrade - create prorated order
      const order = await RazorpayService.createUpgradeOrder(tenantId, planId)

      return apiResponse({
        type: "order",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        tenantName: tenantName,
        tenantEmail: tenant?.email || "",
        planName: plan.name,
        notes: {
          tenantId,
          planId,
          type: "upgrade",
        },
      })
    }

    // Create new subscription in Razorpay
    const razorpaySubscription = await RazorpayService.createSubscription({
      tenantId,
      planId,
      totalCount: plan.billingInterval === "YEARLY" ? 10 : 120, // 10 years or 10 years worth of months
    })

    // Create subscription record in our database (pending state)
    await SubscriptionService.create(tenantId, planId)

    // Update with Razorpay subscription ID
    await prisma.subscription.updateMany({
      where: {
        tenantId,
        status: { in: ["TRIALING", "ACTIVE"] },
      },
      data: {
        razorpaySubscriptionId: razorpaySubscription.id,
      },
    })

    return apiResponse({
      type: "subscription",
      subscriptionId: razorpaySubscription.id,
      keyId: getRazorpayKeyId(),
      tenantName: tenantName,
      tenantEmail: tenant?.email || "",
      planName: plan.name,
      amount: plan.price * 100, // In paise
      currency: "INR",
      shortUrl: razorpaySubscription.short_url,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
