/**
 * Razorpay Service
 *
 * Handles all Razorpay payment operations including:
 * - Customer management
 * - Subscription creation and management
 * - Order creation for one-time payments
 * - Payment verification
 * - Webhook signature verification
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"
import { razorpay, razorpayWebhookSecret, isRazorpayConfigured } from "@/lib/razorpay"
import { PlanService } from "./plan.service"
import { SubscriptionService } from "./subscription.service"

/**
 * Razorpay Customer interface
 */
interface RazorpayCustomer {
  id: string
  name: string
  email: string
  contact: string
}

/**
 * Razorpay Plan interface
 */
interface RazorpayPlan {
  id: string
  period: string
  interval: number
  item: {
    id: string
    name: string
    amount: number
    currency: string
  }
}

/**
 * Razorpay Subscription interface
 */
interface RazorpaySubscription {
  id: string
  plan_id: string
  customer_id: string
  status: string
  current_start: number
  current_end: number
  ended_at: number | null
  quantity: number
  short_url: string
}

/**
 * Razorpay Order interface
 */
interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: string
  receipt: string
}

/**
 * Razorpay Payment interface
 */
interface RazorpayPayment {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  method: string
  email: string
  contact: string
}

/**
 * Razorpay Service class
 */
export class RazorpayService {
  /**
   * Check if Razorpay is available
   */
  static isAvailable(): boolean {
    return isRazorpayConfigured()
  }

  /**
   * Ensure Razorpay is configured
   */
  private static ensureConfigured(): void {
    if (!razorpay) {
      throw new Error("Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    }
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create a Razorpay customer
   */
  static async createCustomer(data: {
    name: string
    email: string
    contact?: string
    notes?: Record<string, string>
  }): Promise<RazorpayCustomer> {
    this.ensureConfigured()

    const customer = await razorpay!.customers.create({
      name: data.name,
      email: data.email,
      contact: data.contact || "",
      notes: data.notes || {},
    })

    return customer as RazorpayCustomer
  }

  /**
   * Get or create a Razorpay customer for a tenant
   */
  static async getOrCreateCustomer(tenantId: string): Promise<RazorpayCustomer> {
    this.ensureConfigured()

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      throw new Error("Tenant not found")
    }

    // Check if customer already exists
    if (tenant.razorpayCustomerId) {
      try {
        const customer = await razorpay!.customers.fetch(tenant.razorpayCustomerId)
        return customer as RazorpayCustomer
      } catch {
        // Customer not found in Razorpay, create new one
      }
    }

    // Create new customer
    const customer = await this.createCustomer({
      name: tenant.name,
      email: tenant.email || `tenant-${tenant.id}@billing.local`,
      contact: tenant.phone || "",
      notes: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    })

    // Store customer ID in tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { razorpayCustomerId: customer.id },
    })

    return customer
  }

  // ============================================================================
  // PLAN MANAGEMENT
  // ============================================================================

  /**
   * Create a Razorpay plan
   */
  static async createPlan(data: {
    name: string
    amount: number // in paise (INR * 100)
    period: "daily" | "weekly" | "monthly" | "yearly"
    interval?: number
    description?: string
    notes?: Record<string, string>
  }): Promise<RazorpayPlan> {
    this.ensureConfigured()

    const plan = await razorpay!.plans.create({
      period: data.period,
      interval: data.interval || 1,
      item: {
        name: data.name,
        amount: data.amount,
        currency: "INR",
        description: data.description || "",
      },
      notes: data.notes || {},
    })

    return plan as RazorpayPlan
  }

  /**
   * Sync a plan to Razorpay
   */
  static async syncPlanToRazorpay(planId: string): Promise<string> {
    this.ensureConfigured()

    const plan = await PlanService.getById(planId)
    if (!plan) {
      throw new Error("Plan not found")
    }

    // Skip free plans
    if (plan.price === 0) {
      return ""
    }

    // Check if already synced
    if (plan.razorpayPlanId) {
      return plan.razorpayPlanId
    }

    // Create in Razorpay
    const razorpayPlan = await this.createPlan({
      name: plan.name,
      amount: Math.round(plan.price * 100), // Convert to paise
      period: plan.billingInterval.toLowerCase() as "monthly" | "yearly",
      description: plan.description || undefined,
      notes: {
        planId: plan.id,
        planSlug: plan.slug,
      },
    })

    // Update plan with Razorpay ID
    await PlanService.update(planId, {
      razorpayPlanId: razorpayPlan.id,
    })

    return razorpayPlan.id
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Create a Razorpay subscription
   */
  static async createSubscription(data: {
    tenantId: string
    planId: string
    totalCount?: number // Number of billing cycles
    startAt?: Date
    notes?: Record<string, string>
  }): Promise<RazorpaySubscription> {
    this.ensureConfigured()

    // Get plan details
    const plan = await PlanService.getById(data.planId)
    if (!plan) {
      throw new Error("Plan not found")
    }

    if (plan.price === 0) {
      throw new Error("Cannot create Razorpay subscription for free plan")
    }

    // Ensure plan is synced to Razorpay
    let razorpayPlanId = plan.razorpayPlanId
    if (!razorpayPlanId) {
      razorpayPlanId = await this.syncPlanToRazorpay(data.planId)
    }

    // Get or create customer
    const customer = await this.getOrCreateCustomer(data.tenantId)

    // Create subscription
    // Note: customer_id is supported by Razorpay API but not in SDK types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionParams: any = {
      plan_id: razorpayPlanId,
      customer_id: customer.id,
      total_count: data.totalCount || 12, // Default 12 billing cycles
      quantity: 1,
      customer_notify: 1,
      start_at: data.startAt ? Math.floor(data.startAt.getTime() / 1000) : undefined,
      notes: {
        tenantId: data.tenantId,
        planId: data.planId,
        ...data.notes,
      },
    }
    const subscription = await razorpay!.subscriptions.create(subscriptionParams)

    return subscription as RazorpaySubscription
  }

  /**
   * Get a Razorpay subscription
   */
  static async getSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    this.ensureConfigured()

    const subscription = await razorpay!.subscriptions.fetch(subscriptionId)
    return subscription as RazorpaySubscription
  }

  /**
   * Cancel a Razorpay subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd = true
  ): Promise<RazorpaySubscription> {
    this.ensureConfigured()

    const subscription = await razorpay!.subscriptions.cancel(
      subscriptionId,
      cancelAtCycleEnd
    )

    return subscription as RazorpaySubscription
  }

  /**
   * Pause a Razorpay subscription
   */
  static async pauseSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    this.ensureConfigured()

    const subscription = await razorpay!.subscriptions.pause(subscriptionId)
    return subscription as RazorpaySubscription
  }

  /**
   * Resume a Razorpay subscription
   */
  static async resumeSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    this.ensureConfigured()

    const subscription = await razorpay!.subscriptions.resume(subscriptionId)
    return subscription as RazorpaySubscription
  }

  // ============================================================================
  // ORDER MANAGEMENT (for one-time payments)
  // ============================================================================

  /**
   * Create a Razorpay order
   */
  static async createOrder(data: {
    amount: number // in paise (INR * 100)
    receipt: string
    notes?: Record<string, string>
  }): Promise<RazorpayOrder> {
    this.ensureConfigured()

    const order = await razorpay!.orders.create({
      amount: data.amount,
      currency: "INR",
      receipt: data.receipt,
      notes: data.notes || {},
    })

    return order as RazorpayOrder
  }

  /**
   * Create order for subscription upgrade
   */
  static async createUpgradeOrder(
    tenantId: string,
    newPlanId: string
  ): Promise<RazorpayOrder> {
    this.ensureConfigured()

    const newPlan = await PlanService.getById(newPlanId)
    if (!newPlan) {
      throw new Error("Plan not found")
    }

    const currentSubscription = await SubscriptionService.getByTenantId(tenantId)

    // Calculate prorated amount if upgrading mid-cycle
    let amount = newPlan.price * 100 // Convert to paise

    if (currentSubscription && currentSubscription.plan.price < newPlan.price) {
      // Calculate remaining days in current period
      const now = new Date()
      const periodEnd = currentSubscription.currentPeriodEnd
      const periodStart = currentSubscription.currentPeriodStart
      const totalDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const remainingDays = Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Prorate: charge the difference for remaining days
      const priceDiff = newPlan.price - currentSubscription.plan.price
      const dailyDiff = priceDiff / totalDays
      amount = Math.round(dailyDiff * remainingDays * 100)
    }

    const order = await this.createOrder({
      amount,
      receipt: `upgrade-${tenantId}-${Date.now()}`,
      notes: {
        tenantId,
        newPlanId,
        type: "upgrade",
      },
    })

    return order
  }

  // ============================================================================
  // PAYMENT VERIFICATION
  // ============================================================================

  /**
   * Verify Razorpay payment signature
   */
  static verifyPaymentSignature(data: {
    orderId: string
    paymentId: string
    signature: string
  }): boolean {
    const body = data.orderId + "|" + data.paymentId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex")

    return expectedSignature === data.signature
  }

  /**
   * Verify Razorpay subscription signature
   */
  static verifySubscriptionSignature(data: {
    subscriptionId: string
    paymentId: string
    signature: string
  }): boolean {
    const body = data.paymentId + "|" + data.subscriptionId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex")

    return expectedSignature === data.signature
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): boolean {
    if (!razorpayWebhookSecret) {
      console.warn("Razorpay webhook secret not configured")
      return false
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpayWebhookSecret)
      .update(body)
      .digest("hex")

    return expectedSignature === signature
  }

  // ============================================================================
  // PAYMENT RECORDING
  // ============================================================================

  /**
   * Record a payment in the database
   */
  static async recordPayment(data: {
    tenantId: string
    subscriptionId?: string
    amount: number
    currency?: string
    status: string
    razorpayPaymentId?: string
    razorpayOrderId?: string
    razorpaySignature?: string
    metadata?: Record<string, string | number | boolean | null>
    failureReason?: string
  }) {
    return prisma.payment.create({
      data: {
        tenantId: data.tenantId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        currency: data.currency || "INR",
        status: data.status,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        razorpaySignature: data.razorpaySignature,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {},
        failureReason: data.failureReason,
      },
    })
  }

  /**
   * Get payment by Razorpay payment ID
   */
  static async getPaymentByRazorpayId(razorpayPaymentId: string) {
    return prisma.payment.findUnique({
      where: { razorpayPaymentId },
    })
  }

  /**
   * Get payments for a tenant
   */
  static async getPaymentsByTenant(
    tenantId: string,
    options: {
      page?: number
      pageSize?: number
      status?: string
    } = {}
  ) {
    const { page = 1, pageSize = 20, status } = options

    const where = {
      tenantId,
      ...(status && { status }),
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: payments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  // ============================================================================
  // FETCH PAYMENT DETAILS
  // ============================================================================

  /**
   * Fetch payment details from Razorpay
   */
  static async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    this.ensureConfigured()

    const payment = await razorpay!.payments.fetch(paymentId)
    return payment as RazorpayPayment
  }
}

export default RazorpayService
