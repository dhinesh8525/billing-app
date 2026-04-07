/**
 * Alert Service
 *
 * Handles in-app notifications and alerts stored in the database.
 * Different from NotificationService which handles email notifications.
 */

import { prisma } from "@/lib/db"

export type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PAYMENT_DUE"
  | "PAYMENT_OVERDUE"
  | "INVOICE_CREATED"
  | "INVOICE_PAID"
  | "NEW_MEMBER"
  | "MEMBER_LEFT"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "USAGE_LIMIT_WARNING"
  | "USAGE_LIMIT_REACHED"
  | "SYSTEM"

export type AlertPriority = "low" | "normal" | "high" | "urgent"

interface CreateAlertInput {
  tenantId: string
  userId?: string | null
  type: AlertType
  title: string
  message: string
  data?: Record<string, string | number | boolean | null>
  priority?: AlertPriority
  expiresAt?: Date
}

interface AlertFilters {
  type?: AlertType
  isRead?: boolean
  priority?: AlertPriority
  limit?: number
  offset?: number
}

export class AlertService {
  /**
   * Create a new alert
   */
  static async create(input: CreateAlertInput) {
    return prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? undefined,
        priority: input.priority || "normal",
        expiresAt: input.expiresAt,
      },
    })
  }

  /**
   * Create alerts for all members of a tenant
   */
  static async createForAllMembers(
    tenantId: string,
    input: Omit<CreateAlertInput, "tenantId" | "userId">
  ) {
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId },
      select: { userId: true },
    })

    const alerts = members.map((member) => ({
      tenantId,
      userId: member.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? undefined,
      priority: input.priority || "normal",
      expiresAt: input.expiresAt,
    }))

    return prisma.notification.createMany({
      data: alerts,
    })
  }

  /**
   * Get alerts for a user
   */
  static async getForUser(
    tenantId: string,
    userId: string,
    filters: AlertFilters = {}
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      OR: [{ userId }, { userId: null }],
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead
    }

    if (filters.priority) {
      where.priority = filters.priority
    }

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          ...where,
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
        orderBy: [{ createdAt: "desc" }],
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      prisma.notification.count({
        where: {
          ...where,
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
      }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
      }),
    ])

    return {
      alerts,
      total,
      unreadCount,
    }
  }

  /**
   * Mark an alert as read
   */
  static async markAsRead(tenantId: string, userId: string, alertId: string) {
    return prisma.notification.updateMany({
      where: {
        id: alertId,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Mark all alerts as read for a user
   */
  static async markAllAsRead(tenantId: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Delete an alert
   */
  static async delete(tenantId: string, userId: string, alertId: string) {
    return prisma.notification.deleteMany({
      where: {
        id: alertId,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
    })
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(tenantId: string, userId: string) {
    return prisma.notification.count({
      where: {
        tenantId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
    })
  }

  /**
   * Clean up old alerts (older than 30 days)
   */
  static async cleanup(tenantId?: string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const where: Record<string, unknown> = {
      OR: [
        { createdAt: { lt: thirtyDaysAgo }, isRead: true },
        { expiresAt: { lt: new Date() } },
      ],
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    return prisma.notification.deleteMany({ where })
  }

  // ============ Alert Generators ============

  /**
   * Check and create low stock alerts
   */
  static async checkLowStock(tenantId: string) {
    // Get products where stock is at or below minStock
    const lowStockProducts = await prisma.$queryRaw<
      { id: string; name: string; sku: string; stock: number; minStock: number }[]
    >`
      SELECT id, name, sku, stock, "minStock"
      FROM "Product"
      WHERE "tenantId" = ${tenantId}
        AND "isActive" = true
        AND stock <= "minStock"
    `

    let createdCount = 0

    for (const product of lowStockProducts) {
      const isOutOfStock = product.stock === 0
      const alertType = isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK"

      // Check if we already have an unread alert for this product
      const existing = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: alertType,
          isRead: false,
        },
      })

      // Check if the existing notification is for this product
      if (existing?.data) {
        const data = existing.data as Record<string, unknown>
        if (data.productId === product.id) {
          continue // Already have an alert for this product
        }
      }

      await this.createForAllMembers(tenantId, {
        type: alertType,
        title: isOutOfStock
          ? `Out of Stock: ${product.name}`
          : `Low Stock: ${product.name}`,
        message: isOutOfStock
          ? `${product.name} (${product.sku}) is out of stock.`
          : `${product.name} (${product.sku}) has ${product.stock} units left (min: ${product.minStock}).`,
        data: {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          currentStock: product.stock,
          minStock: product.minStock,
        },
        priority: isOutOfStock ? "urgent" : "high",
      })

      createdCount++
    }

    return createdCount
  }

  /**
   * Check and create payment due alerts
   */
  static async checkPaymentDue(tenantId: string) {
    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    // Find invoices that are due soon or overdue
    const dueInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        paymentStatus: { in: ["unpaid", "partial"] },
        dueDate: { not: null, lte: threeDaysFromNow },
      },
      include: {
        party: { select: { name: true } },
      },
    })

    let createdCount = 0

    for (const invoice of dueInvoices) {
      if (!invoice.dueDate) continue

      const isOverdue = invoice.dueDate < today
      const alertType = isOverdue ? "PAYMENT_OVERDUE" : "PAYMENT_DUE"

      // Check for existing alert
      const existing = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: alertType,
          isRead: false,
        },
      })

      if (existing?.data) {
        const data = existing.data as Record<string, unknown>
        if (data.invoiceId === invoice.id) {
          continue
        }
      }

      const customerName = invoice.party?.name || invoice.customerName || "Walk-in Customer"
      const balance = Number(invoice.total) - Number(invoice.amountPaid)

      await this.createForAllMembers(tenantId, {
        type: alertType,
        title: isOverdue
          ? `Overdue: #${invoice.invoiceNumber}`
          : `Due Soon: #${invoice.invoiceNumber}`,
        message: isOverdue
          ? `Invoice #${invoice.invoiceNumber} for ${customerName} is overdue. Balance: ₹${balance.toLocaleString("en-IN")}`
          : `Invoice #${invoice.invoiceNumber} for ${customerName} due ${invoice.dueDate.toLocaleDateString("en-IN")}. Balance: ₹${balance.toLocaleString("en-IN")}`,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName,
          balance,
          dueDate: invoice.dueDate.toISOString(),
        },
        priority: isOverdue ? "urgent" : "high",
      })

      createdCount++
    }

    return createdCount
  }

  /**
   * Create alert for new invoice
   */
  static async alertInvoiceCreated(
    tenantId: string,
    invoice: {
      id: string
      invoiceNumber: string
      total: number
      customerName?: string | null
      type: string
    }
  ) {
    const customerName = invoice.customerName || "Walk-in Customer"
    const typeLabel = invoice.type === "SALE" ? "Sale" : "Purchase"

    return this.create({
      tenantId,
      type: "INVOICE_CREATED",
      title: `New ${typeLabel}: #${invoice.invoiceNumber}`,
      message: `${typeLabel} invoice for ${customerName}. Amount: ₹${invoice.total.toLocaleString("en-IN")}`,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        customerName,
        type: invoice.type,
      },
      priority: "normal",
    })
  }

  /**
   * Create alert for subscription expiring
   */
  static async alertSubscriptionExpiring(
    tenantId: string,
    daysRemaining: number,
    planName: string
  ) {
    return this.createForAllMembers(tenantId, {
      type: "SUBSCRIPTION_EXPIRING",
      title: `Subscription Expiring`,
      message: `Your ${planName} subscription expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
      data: {
        daysRemaining,
        planName,
      },
      priority: daysRemaining <= 3 ? "urgent" : "high",
    })
  }

  /**
   * Create alert for usage limit warning
   */
  static async alertUsageLimitWarning(
    tenantId: string,
    metric: string,
    current: number,
    limit: number
  ) {
    const percentage = Math.round((current / limit) * 100)

    return this.createForAllMembers(tenantId, {
      type: "USAGE_LIMIT_WARNING",
      title: `Usage: ${metric}`,
      message: `You've used ${percentage}% of your ${metric.toLowerCase()} quota (${current}/${limit}).`,
      data: {
        metric,
        current,
        limit,
        percentage,
      },
      priority: percentage >= 90 ? "high" : "normal",
    })
  }

  /**
   * Create alert for new team member
   */
  static async alertNewMember(
    tenantId: string,
    memberName: string,
    memberEmail: string,
    role: string
  ) {
    return this.createForAllMembers(tenantId, {
      type: "NEW_MEMBER",
      title: `New Team Member`,
      message: `${memberName} (${memberEmail}) joined as ${role}.`,
      data: {
        memberName,
        memberEmail,
        role,
      },
      priority: "normal",
    })
  }
}
