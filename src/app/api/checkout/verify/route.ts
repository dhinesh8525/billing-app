/**
 * Payment Verification API
 *
 * POST /api/checkout/verify - Verify Razorpay payment signature
 *
 * Verifies the payment signature and activates the subscription
 * after successful payment.
 */

export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { z } from "zod"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { SubscriptionService } from "@/services/subscription.service"
import { RazorpayService } from "@/services/razorpay.service"
import { PlanService } from "@/services/plan.service"

const verifySubscriptionSchema = z.object({
  type: z.literal("subscription"),
  razorpaySubscriptionId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

const verifyOrderSchema = z.object({
  type: z.literal("order"),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  planId: z.string().min(1),
})

const verifySchema = z.discriminatedUnion("type", [
  verifySubscriptionSchema,
  verifyOrderSchema,
])

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const body = await request.json()
    const data = verifySchema.parse(body)

    if (data.type === "subscription") {
      // Verify subscription signature
      const isValid = RazorpayService.verifySubscriptionSignature({
        subscriptionId: data.razorpaySubscriptionId,
        paymentId: data.razorpayPaymentId,
        signature: data.razorpaySignature,
      })

      if (!isValid) {
        return apiResponse({ error: "Invalid payment signature" }, 400)
      }

      // Activate subscription
      const subscription = await SubscriptionService.activate(tenantId, {
        razorpaySubscriptionId: data.razorpaySubscriptionId,
        periodMonths: 1, // Will be updated by webhook
      })

      // Record payment
      await RazorpayService.recordPayment({
        tenantId,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: "INR",
        status: "CAPTURED",
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
        metadata: {
          subscriptionId: data.razorpaySubscriptionId,
          type: "subscription_activation",
        },
      })

      return apiResponse({
        success: true,
        message: "Subscription activated successfully",
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan.name,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      })
    } else {
      // Verify order signature (for upgrades)
      const isValid = RazorpayService.verifyPaymentSignature({
        orderId: data.razorpayOrderId,
        paymentId: data.razorpayPaymentId,
        signature: data.razorpaySignature,
      })

      if (!isValid) {
        return apiResponse({ error: "Invalid payment signature" }, 400)
      }

      // Get plan details
      const plan = await PlanService.getById(data.planId)
      if (!plan) {
        return apiResponse({ error: "Plan not found" }, 404)
      }

      // Change plan
      const subscription = await SubscriptionService.changePlan(
        tenantId,
        data.planId
      )

      // Record payment
      await RazorpayService.recordPayment({
        tenantId,
        subscriptionId: subscription.id,
        amount: plan.price, // This is the prorated amount
        currency: "INR",
        status: "CAPTURED",
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        razorpaySignature: data.razorpaySignature,
        metadata: {
          type: "upgrade",
          newPlanId: data.planId,
        },
      })

      return apiResponse({
        success: true,
        message: "Plan upgraded successfully",
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan.name,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
