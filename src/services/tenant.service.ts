/**
 * Tenant Service
 *
 * Manages tenant operations including profile, switching, and settings.
 */

import { prisma } from "@/lib/db"

export interface TenantProfile {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  logo: string | null
  gstin: string | null
  pan: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  isActive: boolean
  createdAt: Date
}

export interface UserTenant {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: string
  isDefault: boolean
}

/**
 * Tenant Service class
 */
export class TenantService {
  /**
   * Get tenant profile
   */
  static async getProfile(tenantId: string): Promise<TenantProfile | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        logo: true,
        gstin: true,
        pan: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        isActive: true,
        createdAt: true,
      },
    })

    return tenant
  }

  /**
   * Update tenant profile
   */
  static async updateProfile(
    tenantId: string,
    data: Partial<Omit<TenantProfile, "id" | "slug" | "isActive" | "createdAt">>
  ): Promise<TenantProfile> {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        logo: data.logo,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        logo: true,
        gstin: true,
        pan: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        isActive: true,
        createdAt: true,
      },
    })

    return tenant
  }

  /**
   * Get all tenants a user belongs to
   */
  static async getUserTenants(userId: string): Promise<UserTenant[]> {
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        userId,
        tenant: { isActive: true },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { joinedAt: "asc" }],
    })

    return memberships.map((m) => ({
      tenantId: m.tenant.id,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      role: m.role,
      isDefault: m.isDefault,
    }))
  }

  /**
   * Switch user's default tenant
   */
  static async switchTenant(userId: string, tenantId: string): Promise<void> {
    // Verify user has access to this tenant
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        tenant: true,
      },
    })

    if (!membership) {
      throw new Error("You don't have access to this workspace")
    }

    if (!membership.tenant.isActive) {
      throw new Error("This workspace is not active")
    }

    // Update default tenant (transaction to ensure only one default)
    await prisma.$transaction([
      // Remove default from all
      prisma.tenantMembership.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      // Set new default
      prisma.tenantMembership.update({
        where: { id: membership.id },
        data: { isDefault: true },
      }),
    ])
  }

  /**
   * Create a new tenant for a user
   */
  static async createTenant(
    userId: string,
    data: {
      name: string
      email?: string
      phone?: string
    }
  ): Promise<TenantProfile> {
    // Generate slug from name
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30)

    // Ensure unique slug
    let slug = baseSlug
    let counter = 1
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Get free plan
    const freePlan = await prisma.plan.findFirst({
      where: { slug: "free", isActive: true },
    })

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug,
          email: data.email,
          phone: data.phone,
          isActive: true,
        },
      })

      // Create subscription if plan exists
      if (freePlan) {
        await tx.subscription.create({
          data: {
            tenantId: newTenant.id,
            planId: freePlan.id,
            status: "TRIALING",
            trialEndsAt: trialEnd,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
          },
        })
      }

      // Create membership (not default - user keeps current default)
      await tx.tenantMembership.create({
        data: {
          userId,
          tenantId: newTenant.id,
          role: "OWNER",
          isDefault: false,
        },
      })

      // Create default settings
      await tx.settings.createMany({
        data: [
          {
            tenantId: newTenant.id,
            key: "business",
            value: { name: newTenant.name, email: data.email },
          },
          {
            tenantId: newTenant.id,
            key: "tax",
            value: { defaultGstRate: 18, gstType: "regular", enableGst: true },
          },
          {
            tenantId: newTenant.id,
            key: "invoice",
            value: { prefix: "INV", startNumber: 1, termsAndConditions: "" },
          },
        ],
      })

      // Create default cash account
      await tx.bankAccount.create({
        data: {
          tenantId: newTenant.id,
          name: "Cash",
          type: "cash",
          balance: 0,
          isDefault: true,
          isActive: true,
        },
      })

      return newTenant
    })

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      logo: tenant.logo,
      gstin: tenant.gstin,
      pan: tenant.pan,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      pincode: tenant.pincode,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    }
  }

  /**
   * Get tenant statistics
   */
  static async getStats(tenantId: string) {
    const [
      memberCount,
      productCount,
      invoiceCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.tenantMembership.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.invoice.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.invoice.aggregate({
        where: { tenantId, status: "COMPLETED" },
        _sum: { total: true },
      }),
    ])

    return {
      members: memberCount,
      products: productCount,
      invoices: invoiceCount,
      revenue: totalRevenue._sum.total?.toNumber() || 0,
    }
  }
}

export default TenantService
