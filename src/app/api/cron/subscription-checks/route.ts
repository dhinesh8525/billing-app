/**
 * Subscription Checks Cron Job
 *
 * GET /api/cron/subscription-checks
 *
 * Runs periodic checks on subscriptions:
 * - Trial expiring soon (3 days, 1 day)
 * - Trial expired - downgrade to free
 * - Subscription expired
 * - Usage limit warnings
 *
 * Should be called by a cron job (e.g., Vercel Cron, external scheduler)
 * Recommended: Run daily at a fixed time
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { NotificationService } from "@/services"

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/subscription-checks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization")
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const results = {
      trialWarnings: 0,
      trialExpired: 0,
      subscriptionExpired: 0,
      errors: [] as string[],
    }

    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // =========================================================================
    // 1. Check trials expiring in 3 days
    // =========================================================================
    const trialsExpiringSoon = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        tenant: true,
        plan: true,
      },
    })

    for (const sub of trialsExpiringSoon) {
      if (!sub.trialEndsAt) continue

      const daysRemaining = Math.ceil(
        (sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only send at specific intervals (3 days, 1 day)
      if (daysRemaining === 3 || daysRemaining === 1) {
        try {
          await NotificationService.notifyTrialEndingSoon({
            tenantId: sub.tenantId,
            trialEndDate: sub.trialEndsAt,
            daysRemaining,
          })
          results.trialWarnings++
        } catch (err) {
          results.errors.push(
            `Failed to notify trial warning for ${sub.tenantId}: ${err}`
          )
        }
      }
    }

    // =========================================================================
    // 2. Expire trials that have ended
    // =========================================================================
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: {
          lt: now,
        },
      },
      include: {
        tenant: true,
      },
    })

    // Get free plan for downgrade
    const freePlan = await prisma.plan.findFirst({
      where: { slug: "free", isActive: true },
    })

    for (const sub of expiredTrials) {
      try {
        if (freePlan) {
          // Downgrade to free plan
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              planId: freePlan.id,
              trialEndsAt: null,
              currentPeriodStart: now,
              currentPeriodEnd: new Date(
                now.getTime() + 365 * 24 * 60 * 60 * 1000
              ), // 1 year for free plan
            },
          })
        } else {
          // No free plan, mark as expired
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "EXPIRED",
              trialEndsAt: null,
            },
          })
        }
        results.trialExpired++
      } catch (err) {
        results.errors.push(
          `Failed to expire trial for ${sub.tenantId}: ${err}`
        )
      }
    }

    // =========================================================================
    // 3. Check expired subscriptions
    // =========================================================================
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: {
          lt: now,
        },
        razorpaySubscriptionId: null, // Only non-Razorpay (Razorpay handles via webhooks)
      },
    })

    for (const sub of expiredSubscriptions) {
      try {
        if (freePlan) {
          // Downgrade to free
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              planId: freePlan.id,
              currentPeriodStart: now,
              currentPeriodEnd: new Date(
                now.getTime() + 365 * 24 * 60 * 60 * 1000
              ),
            },
          })
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "EXPIRED",
            },
          })
        }
        results.subscriptionExpired++
      } catch (err) {
        results.errors.push(
          `Failed to expire subscription for ${sub.tenantId}: ${err}`
        )
      }
    }

    // =========================================================================
    // 4. Check usage limits (optional - run less frequently)
    // =========================================================================
    // This could be implemented to check if tenants are approaching limits
    // and send notifications

    return NextResponse.json({
      success: true,
      message: "Subscription checks completed",
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Subscription checks cron error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Subscription checks failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
