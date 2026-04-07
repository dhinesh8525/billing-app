/**
 * Tenant Context Management
 *
 * Provides utilities for tenant isolation in multi-tenant SaaS architecture.
 * All database queries MUST use tenantId from this context.
 */

import { prisma } from "./db"
import { getSession } from "./auth"
import { cache } from "react"

export type TenantRoleType = "OWNER" | "ADMIN" | "MEMBER"

export interface TenantContext {
  tenantId: string
  tenantSlug: string
  tenantName: string
  userId: string
  userRole: string
  tenantRole: TenantRoleType
}

/**
 * Get the current tenant context from session
 * This is cached per request using React's cache()
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const session = await getSession()

  if (!session?.user?.id) {
    return null
  }

  // Get user's default tenant membership
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId: session.user.id,
      isDefault: true,
      tenant: { isActive: true },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          isActive: true,
        },
      },
    },
  })

  if (!membership || !membership.tenant.isActive) {
    // Try to get any active tenant membership
    const anyMembership = await prisma.tenantMembership.findFirst({
      where: {
        userId: session.user.id,
        tenant: { isActive: true },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    })

    if (!anyMembership) {
      return null
    }

    return {
      tenantId: anyMembership.tenant.id,
      tenantSlug: anyMembership.tenant.slug,
      tenantName: anyMembership.tenant.name,
      userId: session.user.id,
      userRole: session.user.role,
      tenantRole: anyMembership.role as TenantRoleType,
    }
  }

  return {
    tenantId: membership.tenant.id,
    tenantSlug: membership.tenant.slug,
    tenantName: membership.tenant.name,
    userId: session.user.id,
    userRole: session.user.role,
    tenantRole: membership.role as TenantRoleType,
  }
})

/**
 * Get tenant context or throw error
 * Use this when tenant context is required
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext()

  if (!context) {
    throw new Error("Tenant context required. User must belong to an active tenant.")
  }

  return context
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId, isActive: true },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  })
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug, isActive: true },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  })
}

/**
 * Get all tenants for a user
 */
export async function getUserTenants(userId: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      userId,
      tenant: { isActive: true },
    },
    include: {
      tenant: {
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      },
    },
    orderBy: { isDefault: "desc" },
  })

  return memberships.map((m) => ({
    ...m.tenant,
    memberRole: m.role,
    isDefault: m.isDefault,
  }))
}

/**
 * Switch user's default tenant
 */
export async function switchTenant(userId: string, tenantId: string) {
  // Verify user has access to this tenant
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      userId_tenantId: { userId, tenantId },
    },
    include: {
      tenant: true,
    },
  })

  if (!membership || !membership.tenant.isActive) {
    throw new Error("You don't have access to this tenant")
  }

  // Update default tenant
  await prisma.$transaction([
    // Remove default from all
    prisma.tenantMembership.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    // Set new default
    prisma.tenantMembership.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: { isDefault: true },
    }),
  ])

  return membership.tenant
}

/**
 * Create a new tenant with owner
 */
export async function createTenant(
  name: string,
  slug: string,
  ownerId: string,
  email?: string
) {
  // Verify slug is available
  const existing = await prisma.tenant.findUnique({
    where: { slug },
  })

  if (existing) {
    throw new Error("A business with this URL already exists")
  }

  // Get default plan (Free)
  const freePlan = await prisma.plan.findFirst({
    where: { slug: "free", isActive: true },
  })

  if (!freePlan) {
    throw new Error("No free plan available")
  }

  const now = new Date()
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days trial

  // Create tenant with subscription in transaction
  const tenant = await prisma.$transaction(async (tx) => {
    // Create tenant
    const newTenant = await tx.tenant.create({
      data: {
        name,
        slug,
        email,
        isActive: true,
      },
    })

    // Create subscription
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

    // Add owner membership
    await tx.tenantMembership.create({
      data: {
        userId: ownerId,
        tenantId: newTenant.id,
        role: "OWNER",
        isDefault: true,
      },
    })

    // Create default settings
    await tx.settings.createMany({
      data: [
        {
          tenantId: newTenant.id,
          key: "business",
          value: { name, email },
        },
        {
          tenantId: newTenant.id,
          key: "tax",
          value: {
            defaultGstRate: 18,
            gstType: "regular",
            enableGst: true,
          },
        },
        {
          tenantId: newTenant.id,
          key: "invoice",
          value: {
            prefix: "INV",
            startNumber: 1,
            termsAndConditions: "",
          },
        },
      ],
    })

    // Create default bank account (Cash)
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

  return tenant
}

/**
 * Check if user has permission in current tenant
 */
export function hasPermission(
  tenantRole: TenantContext["tenantRole"],
  requiredRole: "OWNER" | "ADMIN" | "MEMBER"
): boolean {
  const roleHierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
  return roleHierarchy[tenantRole] >= roleHierarchy[requiredRole]
}

/**
 * Require owner role
 */
export async function requireOwner(): Promise<TenantContext> {
  const context = await requireTenantContext()

  if (context.tenantRole !== "OWNER") {
    throw new Error("Owner access required")
  }

  return context
}

/**
 * Require admin or owner role
 */
export async function requireAdmin(): Promise<TenantContext> {
  const context = await requireTenantContext()

  if (!hasPermission(context.tenantRole, "ADMIN")) {
    throw new Error("Admin access required")
  }

  return context
}
