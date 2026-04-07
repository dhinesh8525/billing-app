/**
 * Analytics Service
 *
 * Provides business analytics and insights for tenants.
 */

import { prisma } from "@/lib/db"

interface DateRange {
  start: Date
  end: Date
}

interface SalesAnalytics {
  totalRevenue: number
  totalInvoices: number
  averageOrderValue: number
  revenueByDay: { date: string; revenue: number; count: number }[]
  topProducts: { productName: string; quantity: number; revenue: number }[]
  topCustomers: { name: string; invoiceCount: number; totalSpent: number }[]
  paymentMethods: { method: string; count: number; amount: number }[]
}

interface InventoryAnalytics {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalStockValue: number
  categoryBreakdown: { category: string; count: number; value: number }[]
  lowStockItems: { id: string; name: string; sku: string; stock: number; minStock: number }[]
}

interface GrowthAnalytics {
  newCustomers: number
  repeatCustomers: number
  customerRetentionRate: number
  invoiceGrowth: number
  revenueGrowth: number
  monthlyTrend: { month: string; revenue: number; invoices: number }[]
}

export class AnalyticsService {
  /**
   * Get date range for different periods
   */
  private static getDateRange(period: string): DateRange {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "week":
        start.setDate(start.getDate() - 7)
        break
      case "month":
        start.setMonth(start.getMonth() - 1)
        break
      case "quarter":
        start.setMonth(start.getMonth() - 3)
        break
      case "year":
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start.setMonth(start.getMonth() - 1)
    }

    return { start, end }
  }

  /**
   * Get sales analytics for a tenant
   */
  static async getSalesAnalytics(
    tenantId: string,
    period = "month"
  ): Promise<SalesAnalytics> {
    const { start, end } = this.getDateRange(period)

    // Get completed invoices in period
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        invoiceDate: { gte: start, lte: end },
      },
      include: {
        items: true,
        party: true,
      },
    })

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    )
    const totalInvoices = invoices.length
    const averageOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0

    // Revenue by day
    const revenueByDay = new Map<string, { revenue: number; count: number }>()
    invoices.forEach((inv) => {
      const dateKey = inv.invoiceDate.toISOString().split("T")[0]
      const existing = revenueByDay.get(dateKey) || { revenue: 0, count: 0 }
      existing.revenue += Number(inv.total)
      existing.count += 1
      revenueByDay.set(dateKey, existing)
    })

    // Top products
    const productStats = new Map<
      string,
      { quantity: number; revenue: number }
    >()
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const existing = productStats.get(item.productName) || {
          quantity: 0,
          revenue: 0,
        }
        existing.quantity += item.quantity
        existing.revenue += Number(item.lineTotal)
        productStats.set(item.productName, existing)
      })
    })

    // Top customers
    const customerStats = new Map<
      string,
      { invoiceCount: number; totalSpent: number }
    >()
    invoices.forEach((inv) => {
      const name = inv.party?.name || inv.customerName || "Walk-in"
      const existing = customerStats.get(name) || {
        invoiceCount: 0,
        totalSpent: 0,
      }
      existing.invoiceCount += 1
      existing.totalSpent += Number(inv.total)
      customerStats.set(name, existing)
    })

    // Payment methods
    const paymentStats = new Map<string, { count: number; amount: number }>()
    invoices.forEach((inv) => {
      const method = inv.paymentMode || "Cash"
      const existing = paymentStats.get(method) || { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += Number(inv.total)
      paymentStats.set(method, existing)
    })

    return {
      totalRevenue,
      totalInvoices,
      averageOrderValue,
      revenueByDay: Array.from(revenueByDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: Array.from(productStats.entries())
        .map(([productName, data]) => ({ productName, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      topCustomers: Array.from(customerStats.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10),
      paymentMethods: Array.from(paymentStats.entries())
        .map(([method, data]) => ({ method, ...data }))
        .sort((a, b) => b.amount - a.amount),
    }
  }

  /**
   * Get inventory analytics
   */
  static async getInventoryAnalytics(
    tenantId: string
  ): Promise<InventoryAnalytics> {
    const products = await prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
    })

    const totalProducts = products.length
    const activeProducts = products.filter((p) => p.isActive).length
    const lowStockProducts = products.filter(
      (p) => p.isActive && p.stock > 0 && p.stock <= p.minStock
    ).length
    const outOfStockProducts = products.filter(
      (p) => p.isActive && p.stock === 0
    ).length

    const totalStockValue = products.reduce(
      (sum, p) => sum + Number(p.price) * p.stock,
      0
    )

    // Category breakdown
    const categoryStats = new Map<string, { count: number; value: number }>()
    products.forEach((p) => {
      const catName = p.category?.name || "Uncategorized"
      const existing = categoryStats.get(catName) || { count: 0, value: 0 }
      existing.count += 1
      existing.value += Number(p.price) * p.stock
      categoryStats.set(catName, existing)
    })

    // Low stock items
    const lowStockItems = products
      .filter((p) => p.isActive && p.stock <= p.minStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        minStock: p.minStock,
      }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20)

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
      categoryBreakdown: Array.from(categoryStats.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.count - a.count),
      lowStockItems,
    }
  }

  /**
   * Get growth analytics
   */
  static async getGrowthAnalytics(
    tenantId: string,
    period = "month"
  ): Promise<GrowthAnalytics> {
    const { start: currentStart, end: currentEnd } = this.getDateRange(period)

    // Calculate previous period
    const periodLength = currentEnd.getTime() - currentStart.getTime()
    const previousEnd = new Date(currentStart.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - periodLength)

    // Current period data
    const currentInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        invoiceDate: { gte: currentStart, lte: currentEnd },
      },
      include: { party: true },
    })

    // Previous period data
    const previousInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        invoiceDate: { gte: previousStart, lte: previousEnd },
      },
    })

    const currentRevenue = currentInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    )
    const previousRevenue = previousInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    )

    // Customer analysis
    const currentCustomerIds = new Set(
      currentInvoices
        .filter((inv) => inv.partyId)
        .map((inv) => inv.partyId)
    )

    // New customers this period
    const allPreviousCustomerIds = new Set(
      await prisma.invoice
        .findMany({
          where: {
            tenantId,
            status: "COMPLETED",
            invoiceDate: { lt: currentStart },
            partyId: { not: null },
          },
          select: { partyId: true },
        })
        .then((invs) => invs.map((i) => i.partyId))
    )

    let newCustomers = 0
    let repeatCustomers = 0
    currentCustomerIds.forEach((id) => {
      if (id && allPreviousCustomerIds.has(id)) {
        repeatCustomers++
      } else {
        newCustomers++
      }
    })

    const customerRetentionRate =
      allPreviousCustomerIds.size > 0
        ? (repeatCustomers / allPreviousCustomerIds.size) * 100
        : 0

    // Growth calculations
    const invoiceGrowth =
      previousInvoices.length > 0
        ? ((currentInvoices.length - previousInvoices.length) /
            previousInvoices.length) *
          100
        : 0

    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0

    // Monthly trend (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        invoiceDate: { gte: twelveMonthsAgo },
      },
    })

    const monthlyTrendMap = new Map<
      string,
      { revenue: number; invoices: number }
    >()
    monthlyInvoices.forEach((inv) => {
      const monthKey = `${inv.invoiceDate.getFullYear()}-${String(
        inv.invoiceDate.getMonth() + 1
      ).padStart(2, "0")}`
      const existing = monthlyTrendMap.get(monthKey) || {
        revenue: 0,
        invoices: 0,
      }
      existing.revenue += Number(inv.total)
      existing.invoices += 1
      monthlyTrendMap.set(monthKey, existing)
    })

    return {
      newCustomers,
      repeatCustomers,
      customerRetentionRate,
      invoiceGrowth,
      revenueGrowth,
      monthlyTrend: Array.from(monthlyTrendMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    }
  }

  /**
   * Get dashboard summary for a tenant
   */
  static async getDashboardSummary(tenantId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const [
      todayInvoices,
      monthInvoices,
      pendingPayments,
      lowStockCount,
      recentInvoices,
    ] = await Promise.all([
      // Today's stats
      prisma.invoice.aggregate({
        where: {
          tenantId,
          status: "COMPLETED",
          invoiceDate: { gte: today },
        },
        _sum: { total: true },
        _count: true,
      }),
      // This month's stats
      prisma.invoice.aggregate({
        where: {
          tenantId,
          status: "COMPLETED",
          invoiceDate: { gte: thisMonth },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Pending payments
      prisma.invoice.aggregate({
        where: {
          tenantId,
          status: "COMPLETED",
          paymentStatus: { in: ["unpaid", "partial"] },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Low stock items
      prisma.product.count({
        where: {
          tenantId,
          isActive: true,
          stock: { lte: prisma.product.fields.minStock },
        },
      }),
      // Recent invoices
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          customerName: true,
          party: { select: { name: true } },
          createdAt: true,
        },
      }),
    ])

    return {
      todaySales: Number(todayInvoices._sum.total) || 0,
      todayInvoiceCount: todayInvoices._count,
      monthSales: Number(monthInvoices._sum.total) || 0,
      monthInvoiceCount: monthInvoices._count,
      pendingAmount: Number(pendingPayments._sum.total) || 0,
      pendingCount: pendingPayments._count,
      lowStockCount,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        total: Number(inv.total),
        status: inv.status,
        customerName: inv.party?.name || inv.customerName || "Walk-in",
        createdAt: inv.createdAt,
      })),
    }
  }

  /**
   * Get tax summary for reporting
   */
  static async getTaxSummary(tenantId: string, period = "month") {
    const { start, end } = this.getDateRange(period)

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        invoiceDate: { gte: start, lte: end },
      },
      select: {
        subtotal: true,
        cgst: true,
        sgst: true,
        igst: true,
        taxAmount: true,
        total: true,
      },
    })

    const totals = invoices.reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + Number(inv.subtotal),
        cgst: acc.cgst + Number(inv.cgst),
        sgst: acc.sgst + Number(inv.sgst),
        igst: acc.igst + Number(inv.igst),
        taxAmount: acc.taxAmount + Number(inv.taxAmount),
        total: acc.total + Number(inv.total),
      }),
      { subtotal: 0, cgst: 0, sgst: 0, igst: 0, taxAmount: 0, total: 0 }
    )

    return {
      period: { start, end },
      invoiceCount: invoices.length,
      ...totals,
    }
  }
}
