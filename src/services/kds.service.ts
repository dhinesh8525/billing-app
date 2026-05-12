/**
 * KDS (Kitchen Display System) Service
 *
 * Business logic for kitchen display system operations.
 * Manages KDS configuration, pending orders, and item status updates.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { OrderItemStatus, OrderStatus } from "@prisma/client"

interface KDSConfigInput {
  enableSound?: boolean
  soundVolume?: number
  groupByTable?: boolean
  printOnCreate?: boolean
  autoComplete?: number
}

export class KDSService {
  /**
   * Get or create KDS configuration for tenant
   */
  static async getConfig(tenantId: string) {
    let config = await prisma.kDSConfig.findUnique({
      where: { tenantId },
    })

    if (!config) {
      // Create default config
      config = await prisma.kDSConfig.create({
        data: {
          tenantId,
          enableSound: true,
          soundVolume: 70,
          groupByTable: false,
          printOnCreate: true,
          autoComplete: 0,
        },
      })
    }

    return config
  }

  /**
   * Update KDS configuration
   */
  static async updateConfig(tenantId: string, data: KDSConfigInput) {
    return prisma.kDSConfig.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      },
    })
  }

  /**
   * Get pending orders for KDS display
   */
  static async getPendingOrders(tenantId: string, station?: string, limit = 20) {
    const where = {
      tenantId,
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
      items: {
        some: {
          status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
          ...(station && station !== "ALL" ? { station } : {}),
        },
      },
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: { select: { id: true, tableNumber: true } },
        items: {
          where: {
            status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
            ...(station && station !== "ALL" ? { station } : {}),
          },
          orderBy: { createdAt: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    })

    // Add elapsed time to each order
    return orders.map((order) => ({
      ...order,
      elapsedMinutes: Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / 60000
      ),
    }))
  }

  /**
   * Get order counts by status for dashboard
   */
  static async getOrderCounts(tenantId: string) {
    const [pending, preparing, ready] = await Promise.all([
      prisma.order.count({
        where: {
          tenantId,
          status: OrderStatus.CONFIRMED,
          items: { some: { status: OrderItemStatus.PENDING } },
        },
      }),
      prisma.order.count({
        where: {
          tenantId,
          status: OrderStatus.PREPARING,
          items: { some: { status: OrderItemStatus.PREPARING } },
        },
      }),
      prisma.order.count({
        where: {
          tenantId,
          status: OrderStatus.READY,
        },
      }),
    ])

    return { pending, preparing, ready, total: pending + preparing + ready }
  }

  /**
   * Update order item status
   */
  static async updateItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ) {
    // Verify order belongs to tenant
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    // Update item status
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(status === OrderItemStatus.SERVED
          ? { servedQuantity: { set: undefined } }
          : {}),
      },
    })

    // Check if all items are ready/served and update order status accordingly
    const items = await prisma.orderItem.findMany({
      where: { orderId },
    })

    const allReady = items.every(
      (item) =>
        item.status === OrderItemStatus.READY ||
        item.status === OrderItemStatus.SERVED ||
        item.status === OrderItemStatus.CANCELLED
    )

    const allServed = items.every(
      (item) =>
        item.status === OrderItemStatus.SERVED ||
        item.status === OrderItemStatus.CANCELLED
    )

    const anyPreparing = items.some(
      (item) => item.status === OrderItemStatus.PREPARING
    )

    if (allServed) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SERVED },
      })
    } else if (allReady) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      })
    } else if (anyPreparing) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PREPARING },
      })
    }

    return updatedItem
  }

  /**
   * Mark all items in an order as preparing
   */
  static async startPreparing(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    return prisma.$transaction([
      prisma.orderItem.updateMany({
        where: {
          orderId,
          status: OrderItemStatus.PENDING,
        },
        data: { status: OrderItemStatus.PREPARING },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PREPARING },
      }),
    ])
  }

  /**
   * Mark all items in an order as ready
   */
  static async markOrderReady(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    return prisma.$transaction([
      prisma.orderItem.updateMany({
        where: {
          orderId,
          status: { not: OrderItemStatus.CANCELLED },
        },
        data: { status: OrderItemStatus.READY },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      }),
      // Update KOT receipts
      prisma.kOTReceipt.updateMany({
        where: { orderId, completedAt: null },
        data: { completedAt: new Date() },
      }),
    ])
  }

  /**
   * Bump/recall an order (move to top of queue - just update timestamp)
   */
  static async bumpOrder(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    // Update createdAt to push to end of queue (since we order by createdAt asc)
    // Or we could add a "bumped" flag - for simplicity, just return the order
    return order
  }

  /**
   * Get KOT receipts for an order
   */
  static async getKOTReceipts(tenantId: string, orderId: string) {
    return prisma.kOTReceipt.findMany({
      where: { tenantId, orderId },
      orderBy: { printedAt: "asc" },
    })
  }

  /**
   * Get average preparation time (in minutes)
   */
  static async getAveragePrepTime(tenantId: string, days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const completedOrders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.COMPLETED] },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    })

    if (completedOrders.length === 0) return 0

    const totalMinutes = completedOrders.reduce((sum, order) => {
      const diff = order.updatedAt.getTime() - order.createdAt.getTime()
      return sum + Math.floor(diff / 60000)
    }, 0)

    return Math.round(totalMinutes / completedOrders.length)
  }
}

export default KDSService
