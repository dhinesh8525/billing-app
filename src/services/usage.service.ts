/**
 * Usage Service
 *
 * Tracks usage metrics and enforces plan limits.
 */

import { prisma } from "@/lib/db"

export type UsageMetric =
  | "INVOICES"
  | "PRODUCTS"
  | "USERS"
  | "API_CALLS"
  | "STORAGE_MB"

interface UsageResult {
  current: number
  limit: number
  percentage: number
  isAtLimit: boolean
  remaining: number
}

interface TenantUsageSummary {
  invoices: UsageResult
  products: UsageResult
  users: UsageResult
  apiCalls?: UsageResult
}

export class UsageService {
  /**
   * Get current period key (YYYY-MM)
   */
  private static getCurrentPeriod(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }

  /**
   * Increment usage counter
   */
  static async incrementUsage(
    tenantId: string,
    metric: UsageMetric,
    amount = 1
  ): Promise<void> {
    const period = this.getCurrentPeriod()

    await prisma.usageRecord.upsert({
      where: {
        tenantId_metric_period: { tenantId, metric, period },
      },
      create: {
        tenantId,
        metric,
        period,
        count: amount,
      },
      update: {
        count: { increment: amount },
      },
    })
  }

  /**
   * Decrement usage counter
   */
  static async decrementUsage(
    tenantId: string,
    metric: UsageMetric,
    amount = 1
  ): Promise<void> {
    const period = this.getCurrentPeriod()

    const record = await prisma.usageRecord.findUnique({
      where: {
        tenantId_metric_period: { tenantId, metric, period },
      },
    })

    if (record && record.count > 0) {
      await prisma.usageRecord.update({
        where: {
          tenantId_metric_period: { tenantId, metric, period },
        },
        data: {
          count: { decrement: Math.min(amount, record.count) },
        },
      })
    }
  }

  /**
   * Get usage for a specific metric in current period
   */
  static async getUsage(tenantId: string, metric: UsageMetric): Promise<number> {
    const period = this.getCurrentPeriod()

    const record = await prisma.usageRecord.findUnique({
      where: {
        tenantId_metric_period: { tenantId, metric, period },
      },
    })

    return record?.count ?? 0
  }

  /**
   * Get plan limits for a tenant
   */
  static async getPlanLimits(tenantId: string): Promise<{
    maxUsers: number
    maxProducts: number
    maxInvoicesPerMonth: number
    advancedReports: boolean
    apiAccess: boolean
    prioritySupport: boolean
  }> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription || subscription.status !== "ACTIVE") {
      // Default free tier limits
      return {
        maxUsers: 1,
        maxProducts: 50,
        maxInvoicesPerMonth: 100,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
      }
    }

    const features = subscription.plan.features as Record<string, unknown>

    return {
      maxUsers: (features.maxUsers as number) || 5,
      maxProducts: (features.maxProducts as number) || 500,
      maxInvoicesPerMonth: (features.maxInvoicesPerMonth as number) || 1000,
      advancedReports: (features.advancedReports as boolean) || false,
      apiAccess: (features.apiAccess as boolean) || false,
      prioritySupport: (features.prioritySupport as boolean) || false,
    }
  }

  /**
   * Check if tenant can perform an action (respects limits)
   */
  static async canPerformAction(
    tenantId: string,
    metric: UsageMetric
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.getPlanLimits(tenantId)

    switch (metric) {
      case "INVOICES": {
        const usage = await this.getUsage(tenantId, "INVOICES")
        if (usage >= limits.maxInvoicesPerMonth) {
          return {
            allowed: false,
            reason: `Monthly invoice limit reached (${limits.maxInvoicesPerMonth}). Upgrade your plan for more.`,
          }
        }
        break
      }
      case "PRODUCTS": {
        const productCount = await prisma.product.count({
          where: { tenantId, isActive: true },
        })
        if (productCount >= limits.maxProducts) {
          return {
            allowed: false,
            reason: `Product limit reached (${limits.maxProducts}). Upgrade your plan for more.`,
          }
        }
        break
      }
      case "USERS": {
        const memberCount = await prisma.tenantMembership.count({
          where: { tenantId },
        })
        if (memberCount >= limits.maxUsers) {
          return {
            allowed: false,
            reason: `Team member limit reached (${limits.maxUsers}). Upgrade your plan for more.`,
          }
        }
        break
      }
      case "API_CALLS": {
        if (!limits.apiAccess) {
          return {
            allowed: false,
            reason: "API access is not available on your plan. Upgrade to access the API.",
          }
        }
        break
      }
    }

    return { allowed: true }
  }

  /**
   * Get full usage summary for a tenant
   */
  static async getUsageSummary(tenantId: string): Promise<TenantUsageSummary> {
    const limits = await this.getPlanLimits(tenantId)

    // Get current counts
    const [invoiceUsage, productCount, memberCount] = await Promise.all([
      this.getUsage(tenantId, "INVOICES"),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.tenantMembership.count({ where: { tenantId } }),
    ])

    const createUsageResult = (current: number, limit: number): UsageResult => ({
      current,
      limit,
      percentage: limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0,
      isAtLimit: current >= limit,
      remaining: Math.max(0, limit - current),
    })

    return {
      invoices: createUsageResult(invoiceUsage, limits.maxInvoicesPerMonth),
      products: createUsageResult(productCount, limits.maxProducts),
      users: createUsageResult(memberCount, limits.maxUsers),
    }
  }

  /**
   * Get usage history for a tenant (last 12 months)
   */
  static async getUsageHistory(
    tenantId: string,
    metric: UsageMetric
  ): Promise<{ period: string; count: number }[]> {
    const records = await prisma.usageRecord.findMany({
      where: { tenantId, metric },
      orderBy: { period: "desc" },
      take: 12,
    })

    return records.map((r) => ({
      period: r.period,
      count: r.count,
    }))
  }

  /**
   * Reset usage for a new billing period
   * Called by cron job at start of each month
   */
  static async resetMonthlyUsage(): Promise<number> {
    // Invoices reset each month
    const currentPeriod = this.getCurrentPeriod()

    // Nothing to do - usage records are already per-period
    // This method can be used for any cleanup or notification logic
    console.log(`Usage tracking active for period: ${currentPeriod}`)
    return 0
  }

  /**
   * Sync actual counts with usage records
   * Useful for fixing discrepancies
   */
  static async syncUsageCounts(tenantId: string): Promise<void> {
    const period = this.getCurrentPeriod()

    // Get first day of current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Count invoices created this month
    const invoiceCount = await prisma.invoice.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
    })

    // Update usage record
    await prisma.usageRecord.upsert({
      where: {
        tenantId_metric_period: { tenantId, metric: "INVOICES", period },
      },
      create: {
        tenantId,
        metric: "INVOICES",
        period,
        count: invoiceCount,
      },
      update: {
        count: invoiceCount,
      },
    })
  }

  /**
   * Get tenants approaching their limits (for admin/notifications)
   */
  static async getTenantsNearLimits(
    thresholdPercent = 80
  ): Promise<{ tenantId: string; tenantName: string; metric: string; percentage: number }[]> {
    // Get all active tenants with subscriptions
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            products: true,
            memberships: true,
          },
        },
      },
    })

    const results: { tenantId: string; tenantName: string; metric: string; percentage: number }[] = []
    const period = this.getCurrentPeriod()

    for (const tenant of tenants) {
      const features = (tenant.subscription?.plan.features || {}) as Record<string, unknown>
      const maxProducts = (features.maxProducts as number) || 50
      const maxUsers = (features.maxUsers as number) || 1
      const maxInvoices = (features.maxInvoicesPerMonth as number) || 100

      // Check products
      const productPercent = (tenant._count.products / maxProducts) * 100
      if (productPercent >= thresholdPercent) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          metric: "PRODUCTS",
          percentage: Math.round(productPercent),
        })
      }

      // Check users
      const userPercent = (tenant._count.memberships / maxUsers) * 100
      if (userPercent >= thresholdPercent) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          metric: "USERS",
          percentage: Math.round(userPercent),
        })
      }

      // Check invoices
      const invoiceRecord = await prisma.usageRecord.findUnique({
        where: {
          tenantId_metric_period: { tenantId: tenant.id, metric: "INVOICES", period },
        },
      })
      const invoiceCount = invoiceRecord?.count ?? 0
      const invoicePercent = (invoiceCount / maxInvoices) * 100
      if (invoicePercent >= thresholdPercent) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          metric: "INVOICES",
          percentage: Math.round(invoicePercent),
        })
      }
    }

    return results
  }
}
