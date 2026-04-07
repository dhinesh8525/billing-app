/**
 * Razorpay Webhook Handler
 *
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay webhook events:
 * - subscription.activated
 * - subscription.charged
 * - subscription.pending
 * - subscription.halted
 * - subscription.cancelled
 * - subscription.completed
 * - subscription.paused
 * - subscription.resumed
 * - payment.captured
 * - payment.failed
 * - order.paid
 */

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { RazorpayService } from "@/services/razorpay.service"
import { SubscriptionService } from "@/services/subscription.service"
import { NotificationService } from "@/services/notification.service"

/**
 * Razorpay webhook event structure
 */
interface RazorpayWebhookEvent {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    subscription?: {
      entity: {
        id: string
        plan_id: string
        customer_id: string
        status: string
        current_start: number
        current_end: number
        ended_at: number | null
        quantity: number
        notes: Record<string, string>
      }
    }
    payment?: {
      entity: {
        id: string
        amount: number
        currency: string
        status: string
        order_id: string | null
        invoice_id: string | null
        method: string
        description: string | null
        email: string
        contact: string
        notes: Record<string, string>
        error_code: string | null
        error_description: string | null
        error_reason: string | null
      }
    }
  }
  created_at: number
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get("x-razorpay-signature")

    if (!signature) {
      console.error("Razorpay webhook: Missing signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Verify webhook signature
    const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.error("Razorpay webhook: Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the event
    const event: RazorpayWebhookEvent = JSON.parse(rawBody)
    console.log(`Razorpay webhook received: ${event.event}`)

    // Handle different event types
    switch (event.event) {
      case "subscription.activated":
        await handleSubscriptionActivated(event)
        break

      case "subscription.charged":
        await handleSubscriptionCharged(event)
        break

      case "subscription.pending":
        await handleSubscriptionPending(event)
        break

      case "subscription.halted":
        await handleSubscriptionHalted(event)
        break

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event)
        break

      case "subscription.completed":
        await handleSubscriptionCompleted(event)
        break

      case "payment.captured":
        await handlePaymentCaptured(event)
        break

      case "payment.failed":
        await handlePaymentFailed(event)
        break

      case "subscription.paused":
        await handleSubscriptionPaused(event)
        break

      case "subscription.resumed":
        await handleSubscriptionResumed(event)
        break

      default:
        console.log(`Unhandled Razorpay event: ${event.event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Razorpay webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle subscription.activated event
 * Called when a subscription becomes active after payment
 */
async function handleSubscriptionActivated(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) {
    console.error("Subscription activated: Missing tenantId in notes")
    return
  }

  // Find the subscription in our database
  const subscription = await prisma.subscription.findFirst({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
  })

  if (subscription) {
    // Update existing subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(subscriptionData.current_start * 1000),
        currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
      },
    })
  } else {
    // Create new subscription from Razorpay data
    const planId = subscriptionData.notes?.planId
    if (planId) {
      await SubscriptionService.activate(tenantId, {
        razorpaySubscriptionId: subscriptionData.id,
        razorpayCustomerId: subscriptionData.customer_id,
        periodMonths: 1,
      })
    }
  }

  console.log(`Subscription activated for tenant: ${tenantId}`)

  // Send notification
  const plan = await prisma.plan.findFirst({
    where: { razorpayPlanId: subscriptionData.plan_id },
  })
  if (plan) {
    await NotificationService.notifySubscriptionActivated({
      tenantId,
      planName: plan.name,
      periodEnd: new Date(subscriptionData.current_end * 1000),
    })
  }
}

/**
 * Handle subscription.charged event
 * Called when a recurring payment is successful
 */
async function handleSubscriptionCharged(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  const paymentData = event.payload.payment?.entity

  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) {
    console.error("Subscription charged: Missing tenantId in notes")
    return
  }

  // Update subscription period
  const subscription = await prisma.subscription.findFirst({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(subscriptionData.current_start * 1000),
        currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
      },
    })

    // Record the payment
    if (paymentData) {
      await RazorpayService.recordPayment({
        tenantId,
        subscriptionId: subscription.id,
        amount: paymentData.amount / 100, // Convert from paise to rupees
        currency: paymentData.currency,
        status: "CAPTURED",
        razorpayPaymentId: paymentData.id,
        metadata: {
          method: paymentData.method,
          email: paymentData.email,
          contact: paymentData.contact,
        },
      })
    }
  }

  console.log(`Subscription charged for tenant: ${tenantId}`)

  // Send renewal notification
  if (subscription && paymentData) {
    const plan = await prisma.plan.findUnique({
      where: { id: subscription.planId },
    })
    if (plan) {
      await NotificationService.notifySubscriptionRenewed({
        tenantId,
        planName: plan.name,
        amount: paymentData.amount / 100,
        periodEnd: new Date(subscriptionData.current_end * 1000),
      })
    }
  }
}

/**
 * Handle subscription.pending event
 * Called when payment is pending (e.g., bank transfer)
 */
async function handleSubscriptionPending(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "PAST_DUE",
    },
  })

  console.log(`Subscription pending for tenant: ${tenantId}`)
}

/**
 * Handle subscription.halted event
 * Called when subscription is halted due to payment failures
 */
async function handleSubscriptionHalted(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "PAST_DUE",
    },
  })

  console.log(`Subscription halted for tenant: ${tenantId}`)
}

/**
 * Handle subscription.cancelled event
 * Called when subscription is cancelled
 */
async function handleSubscriptionCancelled(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  const endedAt = subscriptionData.ended_at
    ? new Date(subscriptionData.ended_at * 1000)
    : new Date()

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      currentPeriodEnd: endedAt,
    },
  })

  console.log(`Subscription cancelled for tenant: ${tenantId}`)

  // Send cancellation notification
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
  })
  if (subscription) {
    await NotificationService.notifySubscriptionCancelled({
      tenantId,
      planName: subscription.plan.name,
      endDate: endedAt,
    })
  }
}

/**
 * Handle subscription.completed event
 * Called when subscription completes all billing cycles
 */
async function handleSubscriptionCompleted(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "EXPIRED",
      currentPeriodEnd: new Date(),
    },
  })

  console.log(`Subscription completed for tenant: ${tenantId}`)
}

/**
 * Handle payment.captured event
 * Called when a one-time payment is captured
 */
async function handlePaymentCaptured(event: RazorpayWebhookEvent) {
  const paymentData = event.payload.payment?.entity
  if (!paymentData) return

  const tenantId = paymentData.notes?.tenantId
  if (!tenantId) return

  // Check if payment already recorded
  const existingPayment = await RazorpayService.getPaymentByRazorpayId(paymentData.id)
  if (existingPayment) {
    // Update status if needed
    if (existingPayment.status !== "CAPTURED") {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { status: "CAPTURED" },
      })
    }
    return
  }

  // Record new payment
  await RazorpayService.recordPayment({
    tenantId,
    amount: paymentData.amount / 100,
    currency: paymentData.currency,
    status: "CAPTURED",
    razorpayPaymentId: paymentData.id,
    razorpayOrderId: paymentData.order_id || undefined,
    metadata: {
      method: paymentData.method,
      email: paymentData.email,
      contact: paymentData.contact,
      description: paymentData.description,
    },
  })

  // Handle upgrade payment
  if (paymentData.notes?.type === "upgrade" && paymentData.notes?.newPlanId) {
    await SubscriptionService.changePlan(tenantId, paymentData.notes.newPlanId)
  }

  console.log(`Payment captured for tenant: ${tenantId}`)
}

/**
 * Handle payment.failed event
 * Called when a payment fails
 */
async function handlePaymentFailed(event: RazorpayWebhookEvent) {
  const paymentData = event.payload.payment?.entity
  if (!paymentData) return

  const tenantId = paymentData.notes?.tenantId
  if (!tenantId) return

  // Record failed payment
  await RazorpayService.recordPayment({
    tenantId,
    amount: paymentData.amount / 100,
    currency: paymentData.currency,
    status: "FAILED",
    razorpayPaymentId: paymentData.id,
    razorpayOrderId: paymentData.order_id || undefined,
    failureReason: paymentData.error_description || paymentData.error_reason || "Payment failed",
    metadata: {
      method: paymentData.method,
      email: paymentData.email,
      contact: paymentData.contact,
      errorCode: paymentData.error_code,
      errorReason: paymentData.error_reason,
    },
  })

  console.log(`Payment failed for tenant: ${tenantId}`)

  // Send payment failure notification
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
  })
  if (subscription) {
    await NotificationService.notifyPaymentFailed({
      tenantId,
      planName: subscription.plan.name,
      amount: paymentData.amount / 100,
      reason: paymentData.error_description || paymentData.error_reason || undefined,
    })
  }
}

/**
 * Handle subscription.paused event
 * Called when subscription is paused
 */
async function handleSubscriptionPaused(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "PAUSED",
    },
  })

  console.log(`Subscription paused for tenant: ${tenantId}`)
}

/**
 * Handle subscription.resumed event
 * Called when subscription is resumed after pause
 */
async function handleSubscriptionResumed(event: RazorpayWebhookEvent) {
  const subscriptionData = event.payload.subscription?.entity
  if (!subscriptionData) return

  const tenantId = subscriptionData.notes?.tenantId
  if (!tenantId) return

  await prisma.subscription.updateMany({
    where: {
      tenantId,
      razorpaySubscriptionId: subscriptionData.id,
    },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(subscriptionData.current_start * 1000),
      currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
    },
  })

  console.log(`Subscription resumed for tenant: ${tenantId}`)
}
