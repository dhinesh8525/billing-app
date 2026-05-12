/**
 * Order Service
 *
 * Business logic for restaurant order management.
 * Handles order lifecycle, KOT generation, and order→invoice conversion.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { Prisma, OrderStatus, OrderItemStatus, TableStatus, TransactionType, InvoiceStatus } from "@prisma/client"
import { Decimal } from "decimal.js"
import {
  CreateOrderInput,
  UpdateOrderInput,
  AddOrderItemsInput,
  OrderQuery,
  ConvertToInvoiceInput,
} from "@/validations/order.schema"
import { calculateGST, roundOff, generateInvoiceNumber } from "@/lib/utils"

export class OrderService {
  /**
   * Generate next order number for tenant
   */
  private static async generateOrderNumber(tenantId: string, tx: Prisma.TransactionClient) {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const count = await tx.order.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
      },
    })

    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "")
    return `ORD-${dateStr}-${String(count + 1).padStart(3, "0")}`
  }

  /**
   * Generate KOT number for tenant
   */
  private static async generateKOTNumber(tenantId: string, tx: Prisma.TransactionClient) {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const count = await tx.kOTReceipt.count({
      where: {
        tenantId,
        printedAt: { gte: startOfDay },
      },
    })

    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "")
    return `KOT-${dateStr}-${String(count + 1).padStart(3, "0")}`
  }

  /**
   * Create a new order
   */
  static async createOrder(tenantId: string, data: CreateOrderInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tenantId, tx)

      // If table is specified, verify and update status
      if (data.tableId) {
        const table = await tx.table.findFirst({
          where: { id: data.tableId, tenantId },
        })

        if (!table) {
          throw new Error("Table not found")
        }

        // Update table status to OCCUPIED
        await tx.table.update({
          where: { id: data.tableId },
          data: { status: TableStatus.OCCUPIED },
        })
      }

      // Create the order
      const order = await tx.order.create({
        data: {
          tenantId,
          tableId: data.tableId,
          orderNumber,
          orderType: data.orderType,
          specialNotes: data.specialNotes,
          guestCount: data.guestCount ?? 1,
          status: OrderStatus.CONFIRMED,
          createdById: userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              notes: item.notes,
              station: item.station || "KITCHEN",
              status: OrderItemStatus.PENDING,
            })),
          },
        },
        include: {
          table: { select: { id: true, tableNumber: true } },
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
      })

      // Create KOT receipts grouped by station
      const stations = Array.from(new Set(data.items.map((i) => i.station || "KITCHEN")))
      for (const station of stations) {
        const kotNumber = await this.generateKOTNumber(tenantId, tx)
        await tx.kOTReceipt.create({
          data: {
            tenantId,
            orderId: order.id,
            kotNumber,
            station,
          },
        })

        // Update items with KOT number
        await tx.orderItem.updateMany({
          where: {
            orderId: order.id,
            station,
          },
          data: { kotNumber },
        })
      }

      return order
    })
  }

  /**
   * Get order by ID
   */
  static async getOrderById(tenantId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        table: { select: { id: true, tableNumber: true, status: true } },
        items: { orderBy: { createdAt: "asc" } },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        createdBy: { select: { id: true, name: true } },
        kotReceipts: true,
      },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    return order
  }

  /**
   * List orders with filtering
   */
  static async listOrders(tenantId: string, query: OrderQuery) {
    const {
      tableId,
      status,
      orderType,
      startDate,
      endDate,
      search,
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query

    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(tableId && { tableId }),
      ...(status && { status }),
      ...(orderType && { orderType }),
      ...(startDate && endDate && {
        createdAt: { gte: startDate, lte: endDate },
      }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { table: { tableNumber: { contains: search, mode: "insensitive" } } },
        ],
      }),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          table: { select: { id: true, tableNumber: true } },
          _count: { select: { items: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Get active orders for a table
   */
  static async getTableOrders(tenantId: string, tableId: string) {
    return prisma.order.findMany({
      where: {
        tenantId,
        tableId,
        status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  /**
   * Update order
   */
  static async updateOrder(tenantId: string, id: string, data: UpdateOrderInput) {
    const existing = await prisma.order.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Order not found")
    }

    if (existing.status === OrderStatus.COMPLETED || existing.status === OrderStatus.CANCELLED) {
      throw new Error("Cannot update completed or cancelled order")
    }

    return prisma.order.update({
      where: { id },
      data: {
        ...(data.specialNotes !== undefined && { specialNotes: data.specialNotes }),
        ...(data.guestCount && { guestCount: data.guestCount }),
        ...(data.status && { status: data.status }),
      },
      include: {
        table: { select: { id: true, tableNumber: true } },
        items: true,
      },
    })
  }

  /**
   * Add items to existing order
   */
  static async addOrderItems(tenantId: string, orderId: string, data: AddOrderItemsInput, _userId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        throw new Error("Cannot add items to completed or cancelled order")
      }

      // Create new items
      const newItems = await Promise.all(
        data.items.map((item) =>
          tx.orderItem.create({
            data: {
              orderId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              notes: item.notes,
              station: item.station || "KITCHEN",
              status: OrderItemStatus.PENDING,
            },
          })
        )
      )

      // Create KOT for new items
      const stations = Array.from(new Set(data.items.map((i) => i.station || "KITCHEN")))
      for (const station of stations) {
        const kotNumber = await this.generateKOTNumber(tenantId, tx)
        await tx.kOTReceipt.create({
          data: {
            tenantId,
            orderId,
            kotNumber,
            station,
          },
        })

        // Update new items with KOT number
        const stationItems = newItems.filter(
          (item) => (item.station || "KITCHEN") === station
        )
        await tx.orderItem.updateMany({
          where: {
            id: { in: stationItems.map((i) => i.id) },
          },
          data: { kotNumber },
        })
      }

      // Update order timestamp
      await tx.order.update({
        where: { id: orderId },
        data: { updatedAt: new Date() },
      })

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          table: { select: { id: true, tableNumber: true } },
        },
      })
    })
  }

  /**
   * Update order item status (for KDS)
   */
  static async updateOrderItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: OrderItemStatus,
    servedQuantity?: number
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    })

    if (!item) {
      throw new Error("Order item not found")
    }

    return prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(servedQuantity !== undefined && { servedQuantity }),
      },
    })
  }

  /**
   * Mark all items in order as ready
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
        where: { orderId, status: { not: OrderItemStatus.CANCELLED } },
        data: { status: OrderItemStatus.READY },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      }),
    ])
  }

  /**
   * Convert order to invoice
   */
  static async convertToInvoice(tenantId: string, orderId: string, data: ConvertToInvoiceInput, userId: string) {
    return prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          include: { items: true, table: true },
        })

        if (!order) {
          throw new Error("Order not found")
        }

        if (order.invoiceId) {
          throw new Error("Order already converted to invoice")
        }

        if (order.status === OrderStatus.CANCELLED) {
          throw new Error("Cannot convert cancelled order to invoice")
        }

        // Calculate totals
        let subtotal = new Decimal(0)
        let totalTax = new Decimal(0)
        const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = []

        for (const item of order.items) {
          if (item.status === OrderItemStatus.CANCELLED) continue

          const product = await tx.product.findUnique({
            where: { id: item.productId },
          })

          const unitPrice = new Decimal(item.unitPrice)
          const lineSubtotal = unitPrice.mul(item.quantity)
          const itemTaxRate = product?.taxRate ? product.taxRate.toNumber() : 18
          const lineTax = lineSubtotal.mul(itemTaxRate).div(100)
          const lineTotal = lineSubtotal.plus(lineTax)

          subtotal = subtotal.plus(lineSubtotal)
          totalTax = totalTax.plus(lineTax)

          invoiceItems.push({
            productId: item.productId,
            productName: item.productName,
            productSku: product?.sku || "N/A",
            hsn: product?.hsn,
            unit: product?.unit || "pcs",
            unitPrice,
            quantity: item.quantity,
            taxRate: new Decimal(itemTaxRate),
            taxAmount: lineTax,
            discount: new Decimal(0),
            lineTotal,
          })
        }

        // Apply discount
        const discountPercent = new Decimal(data.discountPercent ?? 0)
        const discountAmount = subtotal.mul(discountPercent).div(100)
        const afterDiscount = subtotal.minus(discountAmount)

        // Calculate GST
        const effectiveTaxRate = subtotal.gt(0)
          ? totalTax.div(subtotal).mul(100).toNumber()
          : 18

        const gst = calculateGST(afterDiscount.toNumber(), effectiveTaxRate, data.isInterstate)
        const beforeRound = afterDiscount.plus(gst.total)
        const { rounded, adjustment } = roundOff(beforeRound.toNumber())

        // Payment status
        const amountPaid = new Decimal(data.amountPaid ?? 0)
        const paymentStatus = amountPaid.gte(rounded) ? "paid" : amountPaid.gt(0) ? "partial" : "unpaid"

        // Generate invoice number
        const invoiceCount = await tx.invoice.count({
          where: {
            tenantId,
            type: TransactionType.SALE,
            invoiceDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        })
        const invoiceNumber = generateInvoiceNumber(invoiceCount + 1, "INV")

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            type: TransactionType.SALE,
            status: InvoiceStatus.COMPLETED,
            partyId: data.partyId,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            subtotal,
            taxRate: new Decimal(effectiveTaxRate),
            cgst: new Decimal(gst.cgst),
            sgst: new Decimal(gst.sgst),
            igst: new Decimal(gst.igst),
            taxAmount: new Decimal(gst.total),
            discountPercent,
            discountAmount,
            roundOff: new Decimal(adjustment),
            total: new Decimal(rounded),
            amountPaid,
            paymentMode: data.paymentMode,
            paymentStatus,
            createdById: userId,
            items: {
              create: invoiceItems,
            },
          },
          include: {
            items: true,
          },
        })

        // Update order with invoice reference
        await tx.order.update({
          where: { id: orderId },
          data: {
            invoiceId: invoice.id,
            status: OrderStatus.COMPLETED,
          },
        })

        // Update table status to BILLING then AVAILABLE
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: paymentStatus === "paid" ? TableStatus.CLEANING : TableStatus.BILLING },
          })
        }

        // Decrement stock for each product
        for (const item of order.items) {
          if (item.status === OrderItemStatus.CANCELLED) continue
          await tx.product.updateMany({
            where: { id: item.productId, tenantId },
            data: { stock: { decrement: item.quantity } },
          })
        }

        return invoice
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    )
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(tenantId: string, orderId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      if (order.invoiceId) {
        throw new Error("Cannot cancel order that has been invoiced")
      }

      // Update order and items
      await tx.orderItem.updateMany({
        where: { orderId },
        data: { status: OrderItemStatus.CANCELLED },
      })

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          specialNotes: reason ? `${order.specialNotes || ""}\nCancelled: ${reason}` : order.specialNotes,
        },
      })

      // Free up the table
      if (order.tableId) {
        // Check if table has other active orders
        const otherOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
          },
        })

        if (otherOrders === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
          })
        }
      }

      return updated
    })
  }

  /**
   * Get pending orders for KDS
   */
  static async getPendingOrders(tenantId: string, station?: string, limit = 20) {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
      items: {
        some: {
          status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
          ...(station && station !== "ALL" && { station }),
        },
      },
    }

    return prisma.order.findMany({
      where,
      include: {
        table: { select: { id: true, tableNumber: true } },
        items: {
          where: {
            status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
            ...(station && station !== "ALL" && { station }),
          },
          orderBy: { createdAt: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    })
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {}

    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      dineInOrders,
      takeawayOrders,
      deliveryOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { tenantId, ...dateFilter } }),
      prisma.order.count({ where: { tenantId, status: OrderStatus.COMPLETED, ...dateFilter } }),
      prisma.order.count({ where: { tenantId, status: OrderStatus.CANCELLED, ...dateFilter } }),
      prisma.order.count({
        where: {
          tenantId,
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
          ...dateFilter,
        },
      }),
      prisma.order.count({ where: { tenantId, orderType: "DINE_IN", ...dateFilter } }),
      prisma.order.count({ where: { tenantId, orderType: "TAKEAWAY", ...dateFilter } }),
      prisma.order.count({ where: { tenantId, orderType: "DELIVERY", ...dateFilter } }),
    ])

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      byType: {
        dineIn: dineInOrders,
        takeaway: takeawayOrders,
        delivery: deliveryOrders,
      },
    }
  }
}

export default OrderService
