/**
 * Feature Gating
 *
 * Utilities for checking feature access based on subscription plan.
 * Used to enforce limits and gate features throughout the application.
 */

import { prisma } from "./db"
import { getTenantContext } from "./tenant"
import { SubscriptionService } from "@/services/subscription.service"
import { PlanFeatures } from "@/services/plan.service"
import { cache } from "react"

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
  upgradeRequired?: boolean
}

/**
 * Get current tenant's plan features
 * Cached per request
 */
export const getTenantFeatures = cache(async (): Promise<PlanFeatures | null> => {
  const context = await getTenantContext()
  if (!context) return null

  const subscription = await SubscriptionService.getByTenantId(context.tenantId)
  if (!subscription) return null

  return subscription.plan.features
})

/**
 * Check if tenant can create more products
 */
export async function canCreateProduct(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  const limit = subscription.plan.features.maxProducts

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true }
  }

  const currentCount = await prisma.product.count({
    where: { tenantId, isActive: true },
  })

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Product limit reached (${currentCount}/${limit})`,
      currentUsage: currentCount,
      limit,
      upgradeRequired: true,
    }
  }

  return {
    allowed: true,
    currentUsage: currentCount,
    limit,
  }
}

/**
 * Check if tenant can create more invoices
 */
export async function canCreateInvoice(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  const limit = subscription.plan.features.maxInvoices

  if (limit === -1) {
    return { allowed: true }
  }

  // Count invoices in current billing period
  const periodStart = subscription.currentPeriodStart

  const currentCount = await prisma.invoice.count({
    where: {
      tenantId,
      createdAt: { gte: periodStart },
    },
  })

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Invoice limit reached (${currentCount}/${limit}) for this billing period`,
      currentUsage: currentCount,
      limit,
      upgradeRequired: true,
    }
  }

  return {
    allowed: true,
    currentUsage: currentCount,
    limit,
  }
}

/**
 * Check if tenant can add more users
 */
export async function canAddUser(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  const limit = subscription.plan.features.maxUsers

  if (limit === -1) {
    return { allowed: true }
  }

  const currentCount = await prisma.tenantMembership.count({
    where: { tenantId },
  })

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `User limit reached (${currentCount}/${limit})`,
      currentUsage: currentCount,
      limit,
      upgradeRequired: true,
    }
  }

  return {
    allowed: true,
    currentUsage: currentCount,
    limit,
  }
}

/**
 * Check if tenant can add more parties (customers/suppliers)
 */
export async function canAddParty(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  const limit = subscription.plan.features.maxParties

  if (limit === -1) {
    return { allowed: true }
  }

  const currentCount = await prisma.party.count({
    where: { tenantId, isActive: true },
  })

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Party limit reached (${currentCount}/${limit})`,
      currentUsage: currentCount,
      limit,
      upgradeRequired: true,
    }
  }

  return {
    allowed: true,
    currentUsage: currentCount,
    limit,
  }
}

/**
 * Check if tenant has access to reports feature
 */
export async function canAccessReports(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  if (!subscription.plan.features.reports) {
    return {
      allowed: false,
      reason: "Reports feature not included in your plan",
      upgradeRequired: true,
    }
  }

  return { allowed: true }
}

/**
 * Check if tenant has access to multi-location feature
 */
export async function canAccessMultiLocation(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  if (!subscription.plan.features.multiLocation) {
    return {
      allowed: false,
      reason: "Multi-location feature not included in your plan",
      upgradeRequired: true,
    }
  }

  return { allowed: true }
}

/**
 * Check if tenant has API access
 */
export async function canAccessApi(tenantId: string): Promise<FeatureCheckResult> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) {
    return { allowed: false, reason: "No active subscription", upgradeRequired: true }
  }

  if (!subscription.plan.features.api) {
    return {
      allowed: false,
      reason: "API access not included in your plan",
      upgradeRequired: true,
    }
  }

  return { allowed: true }
}

/**
 * Get usage summary for a tenant
 */
export async function getUsageSummary(tenantId: string): Promise<{
  products: { current: number; limit: number; percentage: number }
  invoices: { current: number; limit: number; percentage: number }
  users: { current: number; limit: number; percentage: number }
  parties: { current: number; limit: number; percentage: number }
  features: {
    reports: boolean
    multiLocation: boolean
    api: boolean
  }
} | null> {
  const subscription = await SubscriptionService.getByTenantId(tenantId)
  if (!subscription) return null

  const features = subscription.plan.features

  // Get counts in parallel
  const [productCount, invoiceCount, userCount, partyCount] = await Promise.all([
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.invoice.count({
      where: { tenantId, createdAt: { gte: subscription.currentPeriodStart } },
    }),
    prisma.tenantMembership.count({ where: { tenantId } }),
    prisma.party.count({ where: { tenantId, isActive: true } }),
  ])

  const calcPercentage = (current: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, Math.round((current / limit) * 100))
  }

  return {
    products: {
      current: productCount,
      limit: features.maxProducts,
      percentage: calcPercentage(productCount, features.maxProducts),
    },
    invoices: {
      current: invoiceCount,
      limit: features.maxInvoices,
      percentage: calcPercentage(invoiceCount, features.maxInvoices),
    },
    users: {
      current: userCount,
      limit: features.maxUsers,
      percentage: calcPercentage(userCount, features.maxUsers),
    },
    parties: {
      current: partyCount,
      limit: features.maxParties,
      percentage: calcPercentage(partyCount, features.maxParties),
    },
    features: {
      reports: features.reports,
      multiLocation: features.multiLocation,
      api: features.api,
    },
  }
}

/**
 * Middleware helper to check feature access and throw if denied
 */
export async function requireFeature(
  tenantId: string,
  featureCheck: (tenantId: string) => Promise<FeatureCheckResult>
): Promise<void> {
  const result = await featureCheck(tenantId)

  if (!result.allowed) {
    const error = new Error(result.reason || "Feature not available")
    // Add custom property for handling in API error handler
    ;(error as Error & { upgradeRequired?: boolean }).upgradeRequired = result.upgradeRequired
    throw error
  }
}

/**
 * Check if tenant subscription is in good standing
 */
export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  return SubscriptionService.isActive(tenantId)
}
