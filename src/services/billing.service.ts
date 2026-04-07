/**
 * Billing Service
 *
 * Core business logic for invoice creation with atomic stock management.
 * Implements the snapshot pattern for invoice immutability.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 * FEATURE GATED: Invoice creation respects plan limits
 */

import { prisma } from "@/lib/db"
import { Prisma, TransactionType, InvoiceStatus } from "@prisma/client"
import { Decimal } from "decimal.js"
import { CreateInvoiceInput, InvoiceQuery } from "@/validations/invoice.schema"
import { calculateGST, roundOff, generateInvoiceNumber } from "@/lib/utils"
import { canCreateInvoice } from "@/lib/feature-gate"

/**
 * Billing Service class with static methods for invoice operations
 * All methods require tenantId for multi-tenant isolation
 */
export class BillingService {
  /**
   * Create a new invoice with atomic stock management
   * FEATURE GATED: Checks plan limit before creation
   *
   * This method uses a transaction with serializable isolation to:
   * 1. Verify stock availability
   * 2. Decrement stock atomically
   * 3. Create invoice with product snapshots
   * 4. Update party balance if applicable
   */
  static async createInvoice(tenantId: string, data: CreateInvoiceInput, userId: string) {
    // Check plan limits before starting transaction
    const limitCheck = await canCreateInvoice(tenantId)
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || "Invoice limit reached. Please upgrade your plan.")
    }

    return prisma.$transaction(
      async (tx) => {
        // 1. Get next invoice number (tenant-scoped)
        const invoiceCount = await tx.invoice.count({
          where: {
            tenantId, // CRITICAL: Always filter by tenant
            type: data.type || TransactionType.SALE,
            invoiceDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        })

        const prefix =
          data.type === TransactionType.PURCHASE
            ? "PUR"
            : data.type === TransactionType.EXPENSE
            ? "EXP"
            : "INV"

        const invoiceNumber = generateInvoiceNumber(invoiceCount + 1, prefix)

        // 2. Fetch products and verify stock (tenant-scoped)
        const productIds = data.items.map((item) => item.productId)
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, tenantId }, // CRITICAL: Always filter by tenant
        })

        const productMap = new Map(products.map((p) => [p.id, p]))

        // 3. Validate items and prepare snapshots
        const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = []
        let subtotal = new Decimal(0)
        let totalTax = new Decimal(0)

        for (const item of data.items) {
          const product = productMap.get(item.productId)

          if (!product) {
            throw new Error(`Product not found: ${item.productId}`)
          }

          if (!product.isActive) {
            throw new Error(`Product "${product.name}" is no longer available`)
          }

          // Check stock for sales (not for purchases)
          if (
            data.type !== TransactionType.PURCHASE &&
            product.stock < item.quantity
          ) {
            throw new Error(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
            )
          }

          // Calculate line totals
          const unitPrice = new Decimal(item.unitPrice ?? product.price.toNumber())
          const quantity = item.quantity
          const lineDiscount = new Decimal(item.discount ?? 0)
          const lineSubtotal = unitPrice.mul(quantity).minus(lineDiscount)

          // Calculate tax for this item
          const itemTaxRate = product.taxRate
            ? product.taxRate.toNumber()
            : 18 // Default GST rate
          const lineTax = lineSubtotal.mul(itemTaxRate).div(100)
          const lineTotal = lineSubtotal.plus(lineTax)

          subtotal = subtotal.plus(lineSubtotal)
          totalTax = totalTax.plus(lineTax)

          // Create snapshot
          invoiceItems.push({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            hsn: product.hsn,
            unit: product.unit,
            unitPrice,
            quantity,
            taxRate: new Decimal(itemTaxRate),
            taxAmount: lineTax,
            discount: lineDiscount,
            lineTotal,
          })

          // 4. Atomically update stock with verification (tenant-scoped)
          if (data.type === TransactionType.SALE) {
            // Decrement stock for sales
            const updated = await tx.product.updateMany({
              where: {
                id: product.id,
                tenantId, // CRITICAL: Always filter by tenant
                stock: { gte: item.quantity }, // Double-check in WHERE
              },
              data: {
                stock: { decrement: item.quantity },
              },
            })

            if (updated.count === 0) {
              throw new Error(
                `Stock changed during transaction for "${product.name}". Please retry.`
              )
            }
          } else if (data.type === TransactionType.PURCHASE) {
            // Increment stock for purchases (tenant-scoped)
            await tx.product.updateMany({
              where: { id: product.id, tenantId }, // CRITICAL: Always filter by tenant
              data: { stock: { increment: item.quantity } },
            })
          }
        }

        // 5. Calculate totals with GST split
        const discountPercent = new Decimal(data.discountPercent ?? 0)
        const discountAmount = subtotal.mul(discountPercent).div(100)
        const afterDiscount = subtotal.minus(discountAmount)

        // Recalculate tax after discount
        const effectiveTaxRate = subtotal.gt(0)
          ? totalTax.div(subtotal).mul(100).toNumber()
          : 18

        const gst = calculateGST(
          afterDiscount.toNumber(),
          effectiveTaxRate,
          data.isInterstate
        )

        const beforeRound = afterDiscount.plus(gst.total)
        const { rounded, adjustment } = roundOff(beforeRound.toNumber())

        // Determine payment status
        const amountPaid = new Decimal(data.amountPaid ?? 0)
        const paymentStatus =
          amountPaid.gte(rounded)
            ? "paid"
            : amountPaid.gt(0)
            ? "partial"
            : "unpaid"

        // 6. Create invoice (tenant-scoped)
        const invoice = await tx.invoice.create({
          data: {
            tenantId, // CRITICAL: Always include tenant
            invoiceNumber,
            type: data.type || TransactionType.SALE,
            status: InvoiceStatus.COMPLETED,
            partyId: data.partyId,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail,
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
            notes: data.notes,
            createdById: userId,
            invoiceDate: data.invoiceDate || new Date(),
            dueDate: data.dueDate,
            items: {
              create: invoiceItems,
            },
          },
          include: {
            items: true,
            party: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        })

        // 7. Update party balance if linked (tenant-scoped)
        if (data.partyId) {
          const balanceChange =
            data.type === TransactionType.SALE
              ? new Decimal(rounded).minus(amountPaid) // Receivable
              : data.type === TransactionType.PURCHASE
              ? amountPaid.minus(rounded) // Payable (negative)
              : new Decimal(0)

          if (!balanceChange.isZero()) {
            await tx.party.updateMany({
              where: { id: data.partyId, tenantId }, // CRITICAL: Always filter by tenant
              data: {
                currentBalance: {
                  increment: balanceChange.toNumber(),
                },
              },
            })
          }
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
   * Get invoice by ID with all related data (tenant-scoped)
   */
  static async getById(tenantId: string, id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId }, // CRITICAL: Always filter by tenant
      include: {
        items: true,
        party: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    return invoice
  }

  /**
   * Get invoice by invoice number (tenant-scoped)
   */
  static async getByNumber(tenantId: string, invoiceNumber: string) {
    return prisma.invoice.findFirst({
      where: { invoiceNumber, tenantId }, // CRITICAL: Always filter by tenant
      include: {
        items: true,
        party: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * List invoices with filtering and pagination (tenant-scoped)
   */
  static async list(tenantId: string, query: InvoiceQuery) {
    const {
      type,
      status,
      paymentStatus,
      partyId,
      startDate,
      endDate,
      search,
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query

    const where: Prisma.InvoiceWhereInput = {
      tenantId, // CRITICAL: Always filter by tenant
      ...(type && { type }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(partyId && { partyId }),
      ...(startDate &&
        endDate && {
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
          { party: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          party: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Cancel an invoice and restore stock (tenant-scoped)
   */
  static async cancel(tenantId: string, id: string, _userId: string) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, tenantId }, // CRITICAL: Always filter by tenant
        include: { items: true },
      })

      if (!invoice) {
        throw new Error("Invoice not found")
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error("Invoice is already cancelled")
      }

      // Restore stock for sales, decrement for purchases (tenant-scoped)
      for (const item of invoice.items) {
        if (invoice.type === TransactionType.SALE) {
          await tx.product.updateMany({
            where: { id: item.productId, tenantId }, // CRITICAL: Always filter by tenant
            data: { stock: { increment: item.quantity } },
          })
        } else if (invoice.type === TransactionType.PURCHASE) {
          await tx.product.updateMany({
            where: { id: item.productId, tenantId }, // CRITICAL: Always filter by tenant
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      // Reverse party balance if applicable (tenant-scoped)
      if (invoice.partyId) {
        const balanceReverse =
          invoice.type === TransactionType.SALE
            ? invoice.total.toNumber() - invoice.amountPaid.toNumber()
            : invoice.amountPaid.toNumber() - invoice.total.toNumber()

        if (balanceReverse !== 0) {
          await tx.party.updateMany({
            where: { id: invoice.partyId, tenantId }, // CRITICAL: Always filter by tenant
            data: {
              currentBalance: { decrement: balanceReverse },
            },
          })
        }
      }

      // Update invoice status
      const updated = await tx.invoice.updateMany({
        where: { id, tenantId }, // CRITICAL: Always filter by tenant
        data: { status: InvoiceStatus.CANCELLED },
      })

      if (updated.count === 0) {
        throw new Error("Invoice not found")
      }

      return tx.invoice.findFirst({
        where: { id, tenantId },
        include: {
          items: true,
          party: true,
        },
      })
    })
  }

  /**
   * Record a payment against an invoice (tenant-scoped)
   */
  static async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    paymentMode: string
  ) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId }, // CRITICAL: Always filter by tenant
      })

      if (!invoice) {
        throw new Error("Invoice not found")
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error("Cannot record payment for cancelled invoice")
      }

      const currentPaid = invoice.amountPaid.toNumber()
      const total = invoice.total.toNumber()
      const newPaid = currentPaid + amount

      if (newPaid > total) {
        throw new Error(
          `Payment exceeds invoice total. Remaining: ${total - currentPaid}`
        )
      }

      const paymentStatus = newPaid >= total ? "paid" : "partial"

      // Update invoice (tenant-scoped)
      await tx.invoice.updateMany({
        where: { id: invoiceId, tenantId }, // CRITICAL: Always filter by tenant
        data: {
          amountPaid: newPaid,
          paymentMode,
          paymentStatus,
        },
      })

      // Update party balance (tenant-scoped)
      if (invoice.partyId) {
        await tx.party.updateMany({
          where: { id: invoice.partyId, tenantId }, // CRITICAL: Always filter by tenant
          data: {
            currentBalance: { decrement: amount },
          },
        })
      }

      return tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
      })
    })
  }

  /**
   * Get dashboard statistics (tenant-scoped)
   */
  static async getDashboardStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? { invoiceDate: { gte: startDate, lte: endDate } }
      : {}

    // Calculate date ranges for month-over-month comparison
    const today = new Date()
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

    const [
      salesResult,
      purchasesResult,
      receivables,
      payables,
      todaySales,
      todayTransactions,
      lastMonthSales,
    ] = await Promise.all([
      // Total sales (tenant-scoped) - this month
      prisma.invoice.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: TransactionType.SALE,
          status: InvoiceStatus.COMPLETED,
          invoiceDate: { gte: thisMonthStart },
          ...dateFilter,
        },
        _sum: { total: true },
      }),
      // Total purchases (tenant-scoped)
      prisma.invoice.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: TransactionType.PURCHASE,
          status: InvoiceStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: { total: true },
      }),
      // Receivables (customers who owe) (tenant-scoped)
      prisma.party.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: { in: ["customer", "both"] },
          currentBalance: { gt: 0 },
        },
        _sum: { currentBalance: true },
      }),
      // Payables (we owe suppliers) (tenant-scoped)
      prisma.party.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: { in: ["supplier", "both"] },
          currentBalance: { lt: 0 },
        },
        _sum: { currentBalance: true },
      }),
      // Today's sales (tenant-scoped)
      prisma.invoice.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: TransactionType.SALE,
          status: InvoiceStatus.COMPLETED,
          invoiceDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Today's transaction count (tenant-scoped)
      prisma.invoice.count({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          status: InvoiceStatus.COMPLETED,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Last month's sales for growth comparison
      prisma.invoice.aggregate({
        where: {
          tenantId, // CRITICAL: Always filter by tenant
          type: TransactionType.SALE,
          status: InvoiceStatus.COMPLETED,
          invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
    ])

    const thisMonthTotal = salesResult._sum.total?.toNumber() || 0
    const lastMonthTotal = lastMonthSales._sum.total?.toNumber() || 0

    // Calculate month-over-month growth percentage
    const salesGrowth = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : thisMonthTotal > 0 ? 100 : 0

    return {
      totalSales: thisMonthTotal,
      totalPurchases: purchasesResult._sum.total?.toNumber() || 0,
      receivables: receivables._sum.currentBalance?.toNumber() || 0,
      payables: Math.abs(payables._sum.currentBalance?.toNumber() || 0),
      todaySales: todaySales._sum.total?.toNumber() || 0,
      todayTransactions,
      lastMonthSales: lastMonthTotal,
      salesGrowth,
    }
  }

  /**
   * Get recent transactions for dashboard (tenant-scoped)
   */
  static async getRecentTransactions(tenantId: string, limit = 5) {
    return prisma.invoice.findMany({
      where: { tenantId, status: InvoiceStatus.COMPLETED }, // CRITICAL: Always filter by tenant
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        total: true,
        createdAt: true,
        party: { select: { name: true } },
        customerName: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  /**
   * Get monthly sales data for chart (last 12 months) (tenant-scoped)
   */
  static async getMonthlySales(tenantId: string, months = 12) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months + 1)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // Get all completed sales invoices in the date range (tenant-scoped)
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
        type: TransactionType.SALE,
        status: InvoiceStatus.COMPLETED,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        invoiceDate: true,
      },
    })

    // Group by month
    const monthlyData: Record<string, number> = {}

    // Initialize all months with 0
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyData[key] = 0
    }

    // Sum up sales by month
    for (const invoice of invoices) {
      const date = new Date(invoice.invoiceDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += invoice.total.toNumber()
      }
    }

    // Convert to array format for chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return Object.entries(monthlyData).map(([key, value]) => {
      const [year, month] = key.split("-")
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        sales: value,
      }
    })
  }

  /**
   * Get daily sales for the current month (tenant-scoped)
   */
  static async getDailySales(tenantId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
        type: TransactionType.SALE,
        status: InvoiceStatus.COMPLETED,
        invoiceDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        total: true,
        invoiceDate: true,
      },
    })

    // Group by day
    const dailyData: Record<number, number> = {}

    // Initialize all days of the month with 0
    const daysInMonth = endOfMonth.getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      dailyData[i] = 0
    }

    // Sum up sales by day
    for (const invoice of invoices) {
      const day = new Date(invoice.invoiceDate).getDate()
      dailyData[day] += invoice.total.toNumber()
    }

    return Object.entries(dailyData).map(([day, value]) => ({
      day: parseInt(day),
      sales: value,
    }))
  }
}

export default BillingService
