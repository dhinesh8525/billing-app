/**
 * Admin Service
 *
 * Platform administration functions for super admins.
 * Manages tenants, subscriptions, plans, and platform analytics.
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export interface TenantListItem {
  id: string
  name: string
  slug: string
  email: string | null
  isActive: boolean
  createdAt: Date
  subscription: {
    planName: string
    status: string
    currentPeriodEnd: Date
  } | null
  stats: {
    members: number
    invoices: number
    products: number
  }
}

export interface PlatformStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalRevenue: number
  mrr: number // Monthly Recurring Revenue
  subscriptionsByPlan: { planName: string; count: number }[]
  subscriptionsByStatus: { status: string; count: number }[]
  recentSignups: number // Last 30 days
  recentRevenue: number // Last 30 days
}

export interface AdminDashboardData {
  stats: PlatformStats
  recentTenants: TenantListItem[]
  recentPayments: {
    id: string
    tenantName: string
    amount: number
    status: string
    createdAt: Date
  }[]
}

/**
 * Admin Service class
 */
export class AdminService {
  /**
   * Get platform statistics
   */
  static async getPlatformStats(): Promise<PlatformStats> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenueResult,
      recentRevenue,
      recentSignups,
      subscriptionsByPlan,
      subscriptionsByStatus,
      activeSubscriptions,
    ] = await Promise.all([
      // Total tenants
      prisma.tenant.count(),

      // Active tenants
      prisma.tenant.count({ where: { isActive: true } }),

      // Total users
      prisma.user.count(),

      // Total revenue (all time)
      prisma.payment.aggregate({
        where: { status: { in: ["CAPTURED", "captured"] } },
        _sum: { amount: true },
      }),

      // Revenue last 30 days
      prisma.payment.aggregate({
        where: {
          status: { in: ["CAPTURED", "captured"] },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),

      // Signups last 30 days
      prisma.tenant.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),

      // Subscriptions by plan
      prisma.subscription.groupBy({
        by: ["planId"],
        _count: true,
      }),

      // Subscriptions by status
      prisma.subscription.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Active paid subscriptions for MRR calculation
      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          plan: { price: { gt: 0 } },
        },
        include: {
          plan: { select: { price: true, billingInterval: true } },
        },
      }),
    ])

    // Get plan names for subscriptionsByPlan
    const planIds = subscriptionsByPlan.map((s) => s.planId)
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    })
    const planMap = new Map(plans.map((p) => [p.id, p.name]))

    // Calculate MRR
    let mrr = 0
    for (const sub of activeSubscriptions) {
      const price = sub.plan.price.toNumber()
      if (sub.plan.billingInterval === "YEARLY") {
        mrr += price / 12
      } else {
        mrr += price
      }
    }

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenue: totalRevenueResult._sum.amount?.toNumber() || 0,
      mrr: Math.round(mrr * 100) / 100,
      subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
        planName: planMap.get(s.planId) || "Unknown",
        count: s._count,
      })),
      subscriptionsByStatus: subscriptionsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      recentSignups,
      recentRevenue: recentRevenue._sum.amount?.toNumber() || 0,
    }
  }

  /**
   * Get admin dashboard data
   */
  static async getDashboardData(): Promise<AdminDashboardData> {
    const [stats, recentTenants, recentPayments] = await Promise.all([
      this.getPlatformStats(),
      this.listTenants({ page: 1, pageSize: 5, sortBy: "createdAt", sortOrder: "desc" }),
      prisma.payment.findMany({
        where: { status: { in: ["CAPTURED", "captured"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          tenant: { select: { name: true } },
        },
      }),
    ])

    return {
      stats,
      recentTenants: recentTenants.data,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        tenantName: p.tenant.name,
        amount: p.amount.toNumber(),
        status: p.status,
        createdAt: p.createdAt,
      })),
    }
  }

  /**
   * List tenants with pagination and filters
   */
  static async listTenants(options: {
    page?: number
    pageSize?: number
    search?: string
    status?: "active" | "inactive" | "all"
    planId?: string
    sortBy?: "name" | "createdAt" | "invoices"
    sortOrder?: "asc" | "desc"
  }): Promise<{
    data: TenantListItem[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
  }> {
    const {
      page = 1,
      pageSize = 20,
      search,
      status = "all",
      planId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options

    // Build where clause
    const where: Prisma.TenantWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status === "active") {
      where.isActive = true
    } else if (status === "inactive") {
      where.isActive = false
    }

    if (planId) {
      where.subscription = { planId }
    }

    // Build orderBy
    const orderBy: Prisma.TenantOrderByWithRelationInput =
      sortBy === "name"
        ? { name: sortOrder }
        : { createdAt: sortOrder }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subscription: {
            include: {
              plan: { select: { name: true } },
            },
          },
          _count: {
            select: {
              memberships: true,
              invoices: true,
              products: true,
            },
          },
        },
      }),
    ])

    return {
      data: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        email: t.email,
        isActive: t.isActive,
        createdAt: t.createdAt,
        subscription: t.subscription
          ? {
              planName: t.subscription.plan.name,
              status: t.subscription.status,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            }
          : null,
        stats: {
          members: t._count.memberships,
          invoices: t._count.invoices,
          products: t._count.products,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Get tenant details
   */
  static async getTenantDetails(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLogin: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            invoices: true,
            products: true,
            parties: true,
          },
        },
      },
    })

    if (!tenant) return null

    // Get revenue for this tenant
    const revenue = await prisma.payment.aggregate({
      where: {
        tenantId,
        status: { in: ["CAPTURED", "captured"] },
      },
      _sum: { amount: true },
    })

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        createdAt: true,
      },
    })

    return {
      ...tenant,
      revenue: revenue._sum.amount?.toNumber() || 0,
      recentInvoices,
    }
  }

  /**
   * Activate or deactivate a tenant
   */
  static async setTenantStatus(
    tenantId: string,
    isActive: boolean
  ): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    })
  }

  /**
   * Update tenant subscription (admin override)
   */
  static async updateTenantSubscription(
    tenantId: string,
    data: {
      planId?: string
      status?: string
      currentPeriodEnd?: Date
    }
  ): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    })

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: data.planId,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
        },
      })
    } else if (data.planId) {
      // Create new subscription
      const now = new Date()
      await prisma.subscription.create({
        data: {
          tenantId,
          planId: data.planId,
          status: data.status || "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: data.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  /**
   * List all plans
   */
  static async listPlans() {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    })

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price.toNumber(),
      billingInterval: p.billingInterval,
      features: p.features,
      isActive: p.isActive,
      isPopular: p.isPopular,
      sortOrder: p.sortOrder,
      subscriberCount: p._count.subscriptions,
      razorpayPlanId: p.razorpayPlanId,
    }))
  }

  /**
   * Create or update a plan
   */
  static async upsertPlan(
    id: string | null,
    data: {
      name: string
      slug: string
      description?: string
      price: number
      billingInterval: string
      features: Record<string, boolean | number | string>
      isActive?: boolean
      isPopular?: boolean
      sortOrder?: number
    }
  ) {
    if (id) {
      return prisma.plan.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          billingInterval: data.billingInterval,
          features: data.features,
          isActive: data.isActive,
          isPopular: data.isPopular,
          sortOrder: data.sortOrder,
        },
      })
    } else {
      return prisma.plan.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          billingInterval: data.billingInterval,
          features: data.features,
          isActive: data.isActive ?? true,
          isPopular: data.isPopular ?? false,
          sortOrder: data.sortOrder ?? 0,
        },
      })
    }
  }

  /**
   * Get recent payments across all tenants
   */
  static async getRecentPayments(limit = 20) {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        tenant: { select: { name: true, slug: true } },
      },
    })

    return payments.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      tenantName: p.tenant.name,
      tenantSlug: p.tenant.slug,
      amount: p.amount.toNumber(),
      currency: p.currency,
      status: p.status,
      razorpayPaymentId: p.razorpayPaymentId,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
    }))
  }
}

export default AdminService
