/**
 * Subscription Service
 *
 * Business logic for subscription lifecycle management.
 * Handles subscription creation, updates, cancellation, and status checks.
 */

import { prisma } from "@/lib/db"
import { PlanService, PlanFeatures, PlanWithFeatures } from "./plan.service"

/**
 * Subscription status enum
 */
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"

/**
 * Subscription with plan details
 */
export interface SubscriptionWithPlan {
  id: string
  tenantId: string
  planId: string
  status: SubscriptionStatus
  trialEndsAt: Date | null
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt: Date | null
  razorpaySubscriptionId: string | null
  razorpayCustomerId: string | null
  plan: PlanWithFeatures
}

/**
 * Subscription Service class with static methods for subscription operations
 */
export class SubscriptionService {
  /**
   * Get subscription for a tenant
   */
  static async getByTenantId(tenantId: string): Promise<SubscriptionWithPlan | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription) return null

    return {
      ...subscription,
      status: subscription.status as SubscriptionStatus,
      plan: {
        ...subscription.plan,
        price: subscription.plan.price.toNumber(),
        features: subscription.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Get subscription by Razorpay subscription ID
   */
  static async getByRazorpayId(razorpaySubscriptionId: string): Promise<SubscriptionWithPlan | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    })

    if (!subscription) return null

    return {
      ...subscription,
      status: subscription.status as SubscriptionStatus,
      plan: {
        ...subscription.plan,
        price: subscription.plan.price.toNumber(),
        features: subscription.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Create a new subscription for a tenant
   */
  static async create(
    tenantId: string,
    planId: string,
    options: {
      trialDays?: number
      razorpaySubscriptionId?: string
      razorpayCustomerId?: string
    } = {}
  ): Promise<SubscriptionWithPlan> {
    // Check if tenant already has a subscription
    const existing = await prisma.subscription.findUnique({
      where: { tenantId },
    })

    if (existing) {
      throw new Error("Tenant already has a subscription. Use upgrade/downgrade instead.")
    }

    const plan = await PlanService.getById(planId)
    if (!plan) {
      throw new Error("Plan not found")
    }

    const now = new Date()
    const trialDays = options.trialDays ?? 14
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

    // For paid plans, set period end based on billing interval
    const periodEnd = plan.price === 0
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // Free plan: 1 year
      : trialEndsAt // Paid plan: trial end date

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: plan.price === 0 ? "ACTIVE" : "TRIALING",
        trialEndsAt: plan.price > 0 ? trialEndsAt : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        razorpaySubscriptionId: options.razorpaySubscriptionId,
        razorpayCustomerId: options.razorpayCustomerId,
      },
      include: { plan: true },
    })

    return {
      ...subscription,
      status: subscription.status as SubscriptionStatus,
      plan: {
        ...subscription.plan,
        price: subscription.plan.price.toNumber(),
        features: subscription.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Activate subscription (after successful payment)
   */
  static async activate(
    tenantId: string,
    options: {
      razorpaySubscriptionId?: string
      razorpayCustomerId?: string
      periodMonths?: number
    } = {}
  ): Promise<SubscriptionWithPlan> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = new Date()
    const periodMonths = options.periodMonths ?? 1
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

    const updated = await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        ...(options.razorpaySubscriptionId && {
          razorpaySubscriptionId: options.razorpaySubscriptionId,
        }),
        ...(options.razorpayCustomerId && {
          razorpayCustomerId: options.razorpayCustomerId,
        }),
      },
      include: { plan: true },
    })

    return {
      ...updated,
      status: updated.status as SubscriptionStatus,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
        features: updated.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  static async changePlan(
    tenantId: string,
    newPlanId: string,
    options: {
      immediate?: boolean
      razorpaySubscriptionId?: string
    } = {}
  ): Promise<SubscriptionWithPlan> {
    const subscription = await this.getByTenantId(tenantId)
    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const newPlan = await PlanService.getById(newPlanId)
    if (!newPlan) {
      throw new Error("Plan not found")
    }

    const changeType = PlanService.comparePlans(subscription.plan, newPlan)

    // For downgrades, typically take effect at period end
    // For upgrades, can be immediate
    const now = new Date()

    const updated = await prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: newPlanId,
        ...(options.immediate && changeType === "upgrade" && {
          currentPeriodStart: now,
        }),
        ...(options.razorpaySubscriptionId && {
          razorpaySubscriptionId: options.razorpaySubscriptionId,
        }),
      },
      include: { plan: true },
    })

    return {
      ...updated,
      status: updated.status as SubscriptionStatus,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
        features: updated.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Cancel subscription
   */
  static async cancel(
    tenantId: string,
    options: {
      immediate?: boolean
      reason?: string
    } = {}
  ): Promise<SubscriptionWithPlan> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    })

    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = new Date()

    // If immediate cancellation, downgrade to free plan
    if (options.immediate) {
      const freePlan = await PlanService.getDefaultPlan()
      if (!freePlan) {
        throw new Error("No free plan available")
      }

      const updated = await prisma.subscription.update({
        where: { tenantId },
        data: {
          planId: freePlan.id,
          status: "ACTIVE",
          cancelledAt: now,
        },
        include: { plan: true },
      })

      return {
        ...updated,
        status: updated.status as SubscriptionStatus,
        plan: {
          ...updated.plan,
          price: updated.plan.price.toNumber(),
          features: updated.plan.features as PlanFeatures,
        },
      }
    }

    // Otherwise, mark as cancelled but keep active until period end
    const updated = await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
      },
      include: { plan: true },
    })

    return {
      ...updated,
      status: updated.status as SubscriptionStatus,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
        features: updated.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Renew subscription (extend period)
   */
  static async renew(
    tenantId: string,
    periodMonths = 1
  ): Promise<SubscriptionWithPlan> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    })

    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = new Date()
    const newPeriodStart = subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now
    const newPeriodEnd = new Date(newPeriodStart)
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + periodMonths)

    const updated = await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        cancelledAt: null,
      },
      include: { plan: true },
    })

    return {
      ...updated,
      status: updated.status as SubscriptionStatus,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
        features: updated.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Mark subscription as past due
   */
  static async markPastDue(tenantId: string): Promise<SubscriptionWithPlan> {
    const updated = await prisma.subscription.update({
      where: { tenantId },
      data: { status: "PAST_DUE" },
      include: { plan: true },
    })

    return {
      ...updated,
      status: updated.status as SubscriptionStatus,
      plan: {
        ...updated.plan,
        price: updated.plan.price.toNumber(),
        features: updated.plan.features as PlanFeatures,
      },
    }
  }

  /**
   * Check if subscription is active (or in trial)
   */
  static async isActive(tenantId: string): Promise<boolean> {
    const subscription = await this.getByTenantId(tenantId)
    if (!subscription) return false

    const now = new Date()
    const validStatuses: SubscriptionStatus[] = ["ACTIVE", "TRIALING"]

    if (!validStatuses.includes(subscription.status)) {
      return false
    }

    // Check if within period
    if (subscription.currentPeriodEnd < now) {
      return false
    }

    // Check trial expiry
    if (
      subscription.status === "TRIALING" &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt < now
    ) {
      return false
    }

    return true
  }

  /**
   * Get days remaining in trial
   */
  static async getTrialDaysRemaining(tenantId: string): Promise<number | null> {
    const subscription = await this.getByTenantId(tenantId)
    if (!subscription) return null
    if (subscription.status !== "TRIALING") return null
    if (!subscription.trialEndsAt) return null

    const now = new Date()
    const diff = subscription.trialEndsAt.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
  }

  /**
   * Get subscription status details
   */
  static async getStatusDetails(tenantId: string): Promise<{
    status: SubscriptionStatus
    isActive: boolean
    plan: PlanWithFeatures
    trialDaysRemaining: number | null
    daysUntilRenewal: number | null
    willCancel: boolean
  } | null> {
    const subscription = await this.getByTenantId(tenantId)
    if (!subscription) return null

    const now = new Date()
    const isActive = await this.isActive(tenantId)
    const trialDaysRemaining = await this.getTrialDaysRemaining(tenantId)

    const daysUntilRenewal = subscription.currentPeriodEnd
      ? Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : null

    return {
      status: subscription.status,
      isActive,
      plan: subscription.plan,
      trialDaysRemaining,
      daysUntilRenewal,
      willCancel: subscription.status === "CANCELLED" && subscription.cancelledAt !== null,
    }
  }

  /**
   * Process expired trials (batch job)
   */
  static async processExpiredTrials(): Promise<number> {
    const now = new Date()

    // Find all expired trials
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: { lt: now },
      },
    })

    // Get free plan for downgrade
    const freePlan = await PlanService.getDefaultPlan()

    if (!freePlan) {
      console.error("No free plan found for trial expiry downgrade")
      return 0
    }

    // Downgrade each to free plan
    let count = 0
    for (const sub of expiredTrials) {
      try {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: freePlan.id,
            status: "ACTIVE",
          },
        })
        count++
      } catch (error) {
        console.error(`Failed to process expired trial for tenant ${sub.tenantId}:`, error)
      }
    }

    return count
  }

  /**
   * Process expired subscriptions (batch job)
   */
  static async processExpiredSubscriptions(): Promise<number> {
    const now = new Date()

    // Find all expired paid subscriptions
    const expired = await prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { lt: now },
        plan: { price: { gt: 0 } },
      },
    })

    // Get free plan for downgrade
    const freePlan = await PlanService.getDefaultPlan()

    if (!freePlan) {
      console.error("No free plan found for subscription expiry downgrade")
      return 0
    }

    // Downgrade each to free plan
    let count = 0
    for (const sub of expired) {
      try {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: freePlan.id,
            status: "EXPIRED",
          },
        })
        count++
      } catch (error) {
        console.error(`Failed to process expired subscription for tenant ${sub.tenantId}:`, error)
      }
    }

    return count
  }
}

export default SubscriptionService
