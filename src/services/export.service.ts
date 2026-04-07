/**
 * Export Service
 *
 * Handles data export to CSV format.
 */

import { prisma } from "@/lib/db"

interface ExportOptions {
  startDate?: Date
  endDate?: Date
  status?: string
  type?: string
}

/**
 * Convert array of objects to CSV string
 */
function toCSV(data: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  if (data.length === 0) {
    return columns.map((c) => c.header).join(",")
  }

  const headers = columns.map((c) => `"${c.header}"`).join(",")
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key]
        if (value === null || value === undefined) return ""
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
        if (value instanceof Date) return `"${value.toISOString().split("T")[0]}"`
        return String(value)
      })
      .join(",")
  )

  return [headers, ...rows].join("\n")
}

export class ExportService {
  /**
   * Export products to CSV
   */
  static async exportProducts(tenantId: string): Promise<string> {
    const products = await prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    })

    const data = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      description: p.description || "",
      category: p.category?.name || "",
      price: Number(p.price),
      costPrice: p.costPrice ? Number(p.costPrice) : "",
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      hsn: p.hsn || "",
      taxRate: p.taxRate ? Number(p.taxRate) : "",
      isActive: p.isActive ? "Yes" : "No",
      createdAt: p.createdAt,
    }))

    return toCSV(data, [
      { key: "name", header: "Product Name" },
      { key: "sku", header: "SKU" },
      { key: "description", header: "Description" },
      { key: "category", header: "Category" },
      { key: "price", header: "Selling Price" },
      { key: "costPrice", header: "Cost Price" },
      { key: "stock", header: "Current Stock" },
      { key: "minStock", header: "Min Stock" },
      { key: "unit", header: "Unit" },
      { key: "hsn", header: "HSN Code" },
      { key: "taxRate", header: "Tax Rate %" },
      { key: "isActive", header: "Active" },
      { key: "createdAt", header: "Created Date" },
    ])
  }

  /**
   * Export invoices to CSV
   */
  static async exportInvoices(tenantId: string, options: ExportOptions = {}): Promise<string> {
    const where: Record<string, unknown> = { tenantId }

    if (options.startDate || options.endDate) {
      where.invoiceDate = {}
      if (options.startDate) {
        (where.invoiceDate as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (where.invoiceDate as Record<string, Date>).lte = options.endDate
      }
    }

    if (options.status) {
      where.status = options.status
    }

    if (options.type) {
      where.type = options.type
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        party: true,
        items: true,
      },
      orderBy: { invoiceDate: "desc" },
    })

    const data = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      type: inv.type,
      status: inv.status,
      customerName: inv.party?.name || inv.customerName || "Walk-in",
      customerPhone: inv.party?.phone || inv.customerPhone || "",
      itemCount: inv.items.length,
      subtotal: Number(inv.subtotal),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      totalTax: Number(inv.taxAmount),
      discount: Number(inv.discountAmount),
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      paymentStatus: inv.paymentStatus,
      paymentMode: inv.paymentMode || "",
    }))

    return toCSV(data, [
      { key: "invoiceNumber", header: "Invoice No" },
      { key: "date", header: "Date" },
      { key: "type", header: "Type" },
      { key: "status", header: "Status" },
      { key: "customerName", header: "Customer Name" },
      { key: "customerPhone", header: "Customer Phone" },
      { key: "itemCount", header: "Items" },
      { key: "subtotal", header: "Subtotal" },
      { key: "cgst", header: "CGST" },
      { key: "sgst", header: "SGST" },
      { key: "igst", header: "IGST" },
      { key: "totalTax", header: "Total Tax" },
      { key: "discount", header: "Discount" },
      { key: "total", header: "Total Amount" },
      { key: "amountPaid", header: "Amount Paid" },
      { key: "paymentStatus", header: "Payment Status" },
      { key: "paymentMode", header: "Payment Mode" },
    ])
  }

  /**
   * Export invoice items (line items) to CSV
   */
  static async exportInvoiceItems(tenantId: string, options: ExportOptions = {}): Promise<string> {
    const where: Record<string, unknown> = { tenantId }

    if (options.startDate || options.endDate) {
      where.invoiceDate = {}
      if (options.startDate) {
        (where.invoiceDate as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (where.invoiceDate as Record<string, Date>).lte = options.endDate
      }
    }

    if (options.status) {
      where.status = options.status
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
        party: true,
      },
      orderBy: { invoiceDate: "desc" },
    })

    const data: Record<string, unknown>[] = []
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        data.push({
          invoiceNumber: inv.invoiceNumber,
          date: inv.invoiceDate,
          customerName: inv.party?.name || inv.customerName || "Walk-in",
          productName: item.productName,
          productSku: item.productSku,
          hsn: item.hsn || "",
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxAmount: Number(item.taxAmount),
          discount: Number(item.discount),
          lineTotal: Number(item.lineTotal),
        })
      })
    })

    return toCSV(data, [
      { key: "invoiceNumber", header: "Invoice No" },
      { key: "date", header: "Date" },
      { key: "customerName", header: "Customer" },
      { key: "productName", header: "Product Name" },
      { key: "productSku", header: "SKU" },
      { key: "hsn", header: "HSN" },
      { key: "quantity", header: "Qty" },
      { key: "unit", header: "Unit" },
      { key: "unitPrice", header: "Unit Price" },
      { key: "taxRate", header: "Tax Rate %" },
      { key: "taxAmount", header: "Tax Amount" },
      { key: "discount", header: "Discount" },
      { key: "lineTotal", header: "Line Total" },
    ])
  }

  /**
   * Export parties (customers/suppliers) to CSV
   */
  static async exportParties(tenantId: string, type?: string): Promise<string> {
    const where: Record<string, unknown> = { tenantId }
    if (type) where.type = type

    const parties = await prisma.party.findMany({
      where,
      orderBy: { name: "asc" },
    })

    const data = parties.map((p) => ({
      name: p.name,
      type: p.type,
      phone: p.phone || "",
      email: p.email || "",
      gstin: p.gstin || "",
      pan: p.pan || "",
      billingAddress: p.billingAddress || "",
      shippingAddress: p.shippingAddress || "",
      openingBalance: Number(p.openingBalance),
      currentBalance: Number(p.currentBalance),
      creditLimit: p.creditLimit ? Number(p.creditLimit) : "",
      creditDays: p.creditDays,
      isActive: p.isActive ? "Yes" : "No",
      createdAt: p.createdAt,
    }))

    return toCSV(data, [
      { key: "name", header: "Party Name" },
      { key: "type", header: "Type" },
      { key: "phone", header: "Phone" },
      { key: "email", header: "Email" },
      { key: "gstin", header: "GSTIN" },
      { key: "pan", header: "PAN" },
      { key: "billingAddress", header: "Billing Address" },
      { key: "shippingAddress", header: "Shipping Address" },
      { key: "openingBalance", header: "Opening Balance" },
      { key: "currentBalance", header: "Current Balance" },
      { key: "creditLimit", header: "Credit Limit" },
      { key: "creditDays", header: "Credit Days" },
      { key: "isActive", header: "Active" },
      { key: "createdAt", header: "Created Date" },
    ])
  }

  /**
   * Export GST summary report
   */
  static async exportGSTReport(tenantId: string, options: ExportOptions = {}): Promise<string> {
    const where: Record<string, unknown> = {
      tenantId,
      status: "COMPLETED",
      type: "SALE",
    }

    if (options.startDate || options.endDate) {
      where.invoiceDate = {}
      if (options.startDate) {
        (where.invoiceDate as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (where.invoiceDate as Record<string, Date>).lte = options.endDate
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { party: true },
      orderBy: { invoiceDate: "asc" },
    })

    const data = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      customerName: inv.party?.name || inv.customerName || "Walk-in",
      gstin: inv.party?.gstin || "",
      taxableValue: Number(inv.subtotal),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      totalTax: Number(inv.taxAmount),
      invoiceValue: Number(inv.total),
    }))

    return toCSV(data, [
      { key: "invoiceNumber", header: "Invoice No" },
      { key: "date", header: "Invoice Date" },
      { key: "customerName", header: "Customer Name" },
      { key: "gstin", header: "Customer GSTIN" },
      { key: "taxableValue", header: "Taxable Value" },
      { key: "cgst", header: "CGST" },
      { key: "sgst", header: "SGST" },
      { key: "igst", header: "IGST" },
      { key: "totalTax", header: "Total Tax" },
      { key: "invoiceValue", header: "Invoice Value" },
    ])
  }

  /**
   * Export HSN-wise summary
   */
  static async exportHSNSummary(tenantId: string, options: ExportOptions = {}): Promise<string> {
    const where: Record<string, unknown> = {
      tenantId,
      status: "COMPLETED",
    }

    if (options.startDate || options.endDate) {
      where.invoiceDate = {}
      if (options.startDate) {
        (where.invoiceDate as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (where.invoiceDate as Record<string, Date>).lte = options.endDate
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { items: true },
    })

    // Aggregate by HSN
    const hsnMap = new Map<string, {
      hsn: string
      description: string
      quantity: number
      taxableValue: number
      cgst: number
      sgst: number
      igst: number
      totalTax: number
      totalValue: number
    }>()

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const hsn = item.hsn || "N/A"
        const existing = hsnMap.get(hsn) || {
          hsn,
          description: item.productName,
          quantity: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          totalValue: 0,
        }

        const lineSubtotal = Number(item.unitPrice) * item.quantity - Number(item.discount)
        const taxAmount = Number(item.taxAmount)

        existing.quantity += item.quantity
        existing.taxableValue += lineSubtotal
        existing.totalTax += taxAmount
        existing.totalValue += Number(item.lineTotal)

        // Assume 50-50 split for CGST/SGST if not interstate
        existing.cgst += taxAmount / 2
        existing.sgst += taxAmount / 2

        hsnMap.set(hsn, existing)
      })
    })

    const data = Array.from(hsnMap.values()).sort((a, b) => a.hsn.localeCompare(b.hsn))

    return toCSV(data, [
      { key: "hsn", header: "HSN Code" },
      { key: "description", header: "Description" },
      { key: "quantity", header: "Total Quantity" },
      { key: "taxableValue", header: "Taxable Value" },
      { key: "cgst", header: "CGST" },
      { key: "sgst", header: "SGST" },
      { key: "igst", header: "IGST" },
      { key: "totalTax", header: "Total Tax" },
      { key: "totalValue", header: "Total Value" },
    ])
  }
}
