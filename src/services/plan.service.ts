/**
 * Plan Service
 *
 * Business logic for subscription plan management.
 * Plans define feature limits and pricing for tenants.
 */

import { prisma } from "@/lib/db"

/**
 * Plan features interface
 */
export interface PlanFeatures {
  maxProducts: number // -1 = unlimited
  maxInvoices: number // -1 = unlimited
  maxUsers: number // -1 = unlimited
  maxParties: number // -1 = unlimited
  reports: boolean
  multiLocation: boolean
  api: boolean
  [key: string]: number | boolean // Allow additional features
}

/**
 * Plan with typed features
 */
export interface PlanWithFeatures {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billingInterval: string
  features: PlanFeatures
  razorpayPlanId: string | null
  isActive: boolean
  isPopular: boolean
  sortOrder: number
}

/**
 * Plan Service class with static methods for plan operations
 */
export class PlanService {
  /**
   * Get all active plans (for pricing page)
   */
  static async getActivePlans(): Promise<PlanWithFeatures[]> {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })

    return plans.map((plan) => ({
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }))
  }

  /**
   * Get plan by ID
   */
  static async getById(id: string): Promise<PlanWithFeatures | null> {
    const plan = await prisma.plan.findUnique({
      where: { id },
    })

    if (!plan) return null

    return {
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }
  }

  /**
   * Get plan by slug
   */
  static async getBySlug(slug: string): Promise<PlanWithFeatures | null> {
    const plan = await prisma.plan.findUnique({
      where: { slug },
    })

    if (!plan) return null

    return {
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }
  }

  /**
   * Get plan by Razorpay plan ID
   */
  static async getByRazorpayId(razorpayPlanId: string): Promise<PlanWithFeatures | null> {
    const plan = await prisma.plan.findUnique({
      where: { razorpayPlanId },
    })

    if (!plan) return null

    return {
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }
  }

  /**
   * Create a new plan (admin only)
   */
  static async create(data: {
    name: string
    slug: string
    description?: string
    price: number
    billingInterval?: string
    features: PlanFeatures
    razorpayPlanId?: string
    isPopular?: boolean
    sortOrder?: number
  }) {
    // Check for duplicate slug
    const existing = await prisma.plan.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      throw new Error(`Plan with slug "${data.slug}" already exists`)
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        billingInterval: data.billingInterval || "MONTHLY",
        features: data.features,
        razorpayPlanId: data.razorpayPlanId,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
        isActive: true,
      },
    })

    return {
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }
  }

  /**
   * Update a plan (admin only)
   */
  static async update(
    id: string,
    data: Partial<{
      name: string
      description: string
      price: number
      features: PlanFeatures
      razorpayPlanId: string
      isActive: boolean
      isPopular: boolean
      sortOrder: number
    }>
  ) {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.razorpayPlanId !== undefined && { razorpayPlanId: data.razorpayPlanId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    })

    return {
      ...plan,
      price: plan.price.toNumber(),
      features: plan.features as PlanFeatures,
    }
  }

  /**
   * Compare two plans (for upgrade/downgrade logic)
   */
  static comparePlans(
    currentPlan: PlanWithFeatures,
    targetPlan: PlanWithFeatures
  ): "upgrade" | "downgrade" | "same" {
    if (currentPlan.id === targetPlan.id) return "same"
    return targetPlan.price > currentPlan.price ? "upgrade" : "downgrade"
  }

  /**
   * Get default (free) plan
   */
  static async getDefaultPlan(): Promise<PlanWithFeatures | null> {
    return this.getBySlug("free")
  }
}

export default PlanService
