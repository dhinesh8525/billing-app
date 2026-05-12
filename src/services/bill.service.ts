/**
 * Bill Service
 *
 * Business logic for bill splitting and merging operations.
 * Handles split by items, percentage, equal splits, and bill/table merging.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { Prisma, InvoiceStatus, TransactionType, TableStatus } from "@prisma/client"
import { Decimal } from "decimal.js"
import {
  SplitByItemsInput,
  SplitEquallyInput,
  SplitByPercentageInput,
  MergeBillsInput,
} from "@/validations/bill.schema"
import { generateInvoiceNumber, roundOff } from "@/lib/utils"

export class BillService {
  /**
   * Split a bill by items - each split gets specific items
   */
  static async splitByItems(tenantId: string, data: SplitByItemsInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      // Get original invoice
      const original = await tx.invoice.findFirst({
        where: { id: data.invoiceId, tenantId },
        include: { items: true },
      })

      if (!original) {
        throw new Error("Invoice not found")
      }

      if (original.status === InvoiceStatus.CANCELLED) {
        throw new Error("Cannot split cancelled invoice")
      }

      // Validate all items exist in original invoice
      const originalItemIds = new Set(original.items.map((i) => i.id))
      const requestedItemIds = new Set(data.splits.flatMap((s) => s.itemIds))

      Array.from(requestedItemIds).forEach((itemId) => {
        if (!originalItemIds.has(itemId)) {
          throw new Error(`Item ${itemId} not found in invoice`)
        }
      })

      // Create new invoices for each split
      const newInvoices = []

      for (const split of data.splits) {
        const splitItems = original.items.filter((i) => split.itemIds.includes(i.id))

        if (splitItems.length === 0) continue

        // Calculate totals for split
        let subtotal = new Decimal(0)
        let totalTax = new Decimal(0)

        const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = []

        for (const item of splitItems) {
          subtotal = subtotal.plus(item.lineTotal).minus(item.taxAmount)
          totalTax = totalTax.plus(item.taxAmount)

          invoiceItems.push({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            hsn: item.hsn,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discount: item.discount,
            lineTotal: item.lineTotal,
          })
        }

        const total = subtotal.plus(totalTax)
        const { rounded } = roundOff(total.toNumber())

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

        // Create split invoice
        const newInvoice = await tx.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            type: original.type,
            status: InvoiceStatus.COMPLETED,
            customerName: split.customerName || original.customerName,
            customerPhone: original.customerPhone,
            subtotal,
            taxRate: original.taxRate,
            cgst: totalTax.div(2),
            sgst: totalTax.div(2),
            igst: new Decimal(0),
            taxAmount: totalTax,
            discountPercent: new Decimal(0),
            discountAmount: new Decimal(0),
            roundOff: new Decimal(rounded).minus(total),
            total: new Decimal(rounded),
            amountPaid: new Decimal(0),
            paymentStatus: "unpaid",
            createdById: userId,
            items: {
              create: invoiceItems,
            },
          },
          include: { items: true },
        })

        // Record transaction history
        await tx.billTransaction.create({
          data: {
            tenantId,
            invoiceId: newInvoice.id,
            transactionType: "SPLIT_TARGET",
            sourceInvoiceId: original.id,
            itemIds: split.itemIds,
            amount: new Decimal(rounded),
            reason: "Split from original bill",
            createdById: userId,
          },
        })

        newInvoices.push(newInvoice)
      }

      // Update original invoice status
      await tx.invoice.update({
        where: { id: original.id },
        data: { status: InvoiceStatus.CANCELLED },
      })

      // Record source transaction
      await tx.billTransaction.create({
        data: {
          tenantId,
          invoiceId: original.id,
          transactionType: "SPLIT_SOURCE",
          targetInvoiceId: newInvoices[0]?.id,
          itemIds: original.items.map((i) => i.id),
          amount: original.total,
          reason: `Split into ${newInvoices.length} bills`,
          createdById: userId,
        },
      })

      return {
        originalInvoice: original,
        newInvoices,
      }
    })
  }

  /**
   * Split a bill equally among N people
   */
  static async splitEqually(tenantId: string, data: SplitEquallyInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.invoice.findFirst({
        where: { id: data.invoiceId, tenantId },
        include: { items: true },
      })

      if (!original) {
        throw new Error("Invoice not found")
      }

      if (original.status === InvoiceStatus.CANCELLED) {
        throw new Error("Cannot split cancelled invoice")
      }

      const totalAmount = original.total.toNumber()
      const splitAmount = totalAmount / data.numberOfSplits
      const { rounded: roundedSplit } = roundOff(splitAmount)

      const newInvoices = []

      for (let i = 0; i < data.numberOfSplits; i++) {
        // For last split, use remaining amount to handle rounding
        const isLast = i === data.numberOfSplits - 1
        const existingSplitsTotal = roundedSplit * i
        const thisAmount = isLast ? totalAmount - existingSplitsTotal : roundedSplit

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

        const taxRatio = new Decimal(thisAmount).div(totalAmount)

        const newInvoice = await tx.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            type: original.type,
            status: InvoiceStatus.COMPLETED,
            customerName: data.customerNames?.[i] || `Guest ${i + 1}`,
            customerPhone: original.customerPhone,
            subtotal: original.subtotal.mul(taxRatio),
            taxRate: original.taxRate,
            cgst: original.cgst.mul(taxRatio),
            sgst: original.sgst.mul(taxRatio),
            igst: original.igst.mul(taxRatio),
            taxAmount: original.taxAmount.mul(taxRatio),
            discountPercent: original.discountPercent,
            discountAmount: original.discountAmount.mul(taxRatio),
            roundOff: new Decimal(0),
            total: new Decimal(thisAmount),
            amountPaid: new Decimal(0),
            paymentStatus: "unpaid",
            notes: `Equal split ${i + 1} of ${data.numberOfSplits}`,
            createdById: userId,
          },
        })

        await tx.billTransaction.create({
          data: {
            tenantId,
            invoiceId: newInvoice.id,
            transactionType: "SPLIT_TARGET",
            sourceInvoiceId: original.id,
            itemIds: [],
            amount: new Decimal(thisAmount),
            reason: `Equal split ${i + 1} of ${data.numberOfSplits}`,
            createdById: userId,
          },
        })

        newInvoices.push(newInvoice)
      }

      // Cancel original
      await tx.invoice.update({
        where: { id: original.id },
        data: { status: InvoiceStatus.CANCELLED },
      })

      await tx.billTransaction.create({
        data: {
          tenantId,
          invoiceId: original.id,
          transactionType: "SPLIT_SOURCE",
          itemIds: [],
          amount: original.total,
          reason: `Split equally into ${data.numberOfSplits} bills`,
          createdById: userId,
        },
      })

      return {
        originalInvoice: original,
        newInvoices,
      }
    })
  }

  /**
   * Split a bill by custom percentages
   */
  static async splitByPercentage(tenantId: string, data: SplitByPercentageInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.invoice.findFirst({
        where: { id: data.invoiceId, tenantId },
        include: { items: true },
      })

      if (!original) {
        throw new Error("Invoice not found")
      }

      if (original.status === InvoiceStatus.CANCELLED) {
        throw new Error("Cannot split cancelled invoice")
      }

      const totalAmount = original.total.toNumber()
      const newInvoices = []

      for (let i = 0; i < data.splits.length; i++) {
        const split = data.splits[i]
        const splitAmount = (totalAmount * split.percentage) / 100
        const { rounded } = roundOff(splitAmount)

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
        const ratio = new Decimal(split.percentage).div(100)

        const newInvoice = await tx.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            type: original.type,
            status: InvoiceStatus.COMPLETED,
            customerName: split.customerName || `Guest ${i + 1}`,
            customerPhone: original.customerPhone,
            subtotal: original.subtotal.mul(ratio),
            taxRate: original.taxRate,
            cgst: original.cgst.mul(ratio),
            sgst: original.sgst.mul(ratio),
            igst: original.igst.mul(ratio),
            taxAmount: original.taxAmount.mul(ratio),
            discountPercent: original.discountPercent,
            discountAmount: original.discountAmount.mul(ratio),
            roundOff: new Decimal(rounded).minus(splitAmount),
            total: new Decimal(rounded),
            amountPaid: new Decimal(0),
            paymentStatus: "unpaid",
            notes: `${split.percentage}% split`,
            createdById: userId,
          },
        })

        await tx.billTransaction.create({
          data: {
            tenantId,
            invoiceId: newInvoice.id,
            transactionType: "SPLIT_TARGET",
            sourceInvoiceId: original.id,
            itemIds: [],
            amount: new Decimal(rounded),
            reason: `${split.percentage}% split`,
            createdById: userId,
          },
        })

        newInvoices.push(newInvoice)
      }

      // Cancel original
      await tx.invoice.update({
        where: { id: original.id },
        data: { status: InvoiceStatus.CANCELLED },
      })

      await tx.billTransaction.create({
        data: {
          tenantId,
          invoiceId: original.id,
          transactionType: "SPLIT_SOURCE",
          itemIds: [],
          amount: original.total,
          reason: "Split by percentage",
          createdById: userId,
        },
      })

      return {
        originalInvoice: original,
        newInvoices,
      }
    })
  }

  /**
   * Merge multiple bills into one
   */
  static async mergeBills(tenantId: string, data: MergeBillsInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      // Get all invoices
      const invoices = await tx.invoice.findMany({
        where: {
          id: { in: data.invoiceIds },
          tenantId,
          status: InvoiceStatus.COMPLETED,
        },
        include: { items: true },
      })

      if (invoices.length !== data.invoiceIds.length) {
        throw new Error("Some invoices not found or already cancelled")
      }

      // Collect all items
      let subtotal = new Decimal(0)
      let totalTax = new Decimal(0)
      const allItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = []

      for (const invoice of invoices) {
        for (const item of invoice.items) {
          subtotal = subtotal.plus(item.lineTotal).minus(item.taxAmount)
          totalTax = totalTax.plus(item.taxAmount)

          allItems.push({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            hsn: item.hsn,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discount: item.discount,
            lineTotal: item.lineTotal,
          })
        }
      }

      const total = subtotal.plus(totalTax)
      const { rounded, adjustment } = roundOff(total.toNumber())

      // Get primary invoice for customer info
      const primary = invoices.find((i) => i.id === data.primaryInvoiceId) || invoices[0]

      // Generate new invoice number
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

      // Create merged invoice
      const mergedInvoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          type: TransactionType.SALE,
          status: InvoiceStatus.COMPLETED,
          customerName: primary.customerName,
          customerPhone: primary.customerPhone,
          partyId: primary.partyId,
          subtotal,
          taxRate: primary.taxRate,
          cgst: totalTax.div(2),
          sgst: totalTax.div(2),
          igst: new Decimal(0),
          taxAmount: totalTax,
          discountPercent: new Decimal(0),
          discountAmount: new Decimal(0),
          roundOff: new Decimal(adjustment),
          total: new Decimal(rounded),
          amountPaid: new Decimal(0),
          paymentStatus: "unpaid",
          notes: `Merged from ${invoices.length} bills`,
          createdById: userId,
          items: {
            create: allItems,
          },
        },
        include: { items: true },
      })

      // Cancel original invoices and record transactions
      for (const invoice of invoices) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.CANCELLED },
        })

        await tx.billTransaction.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            transactionType: "MERGE_SOURCE",
            targetInvoiceId: mergedInvoice.id,
            itemIds: invoice.items.map((i) => i.id),
            amount: invoice.total,
            reason: "Merged into combined bill",
            createdById: userId,
          },
        })
      }

      // Record merged invoice transaction
      await tx.billTransaction.create({
        data: {
          tenantId,
          invoiceId: mergedInvoice.id,
          transactionType: "MERGE_TARGET",
          itemIds: allItems.map(() => "merged"),
          amount: new Decimal(rounded),
          reason: `Merged from ${invoices.length} bills`,
          createdById: userId,
        },
      })

      return {
        mergedInvoice,
        originalInvoices: invoices,
      }
    })
  }

  /**
   * Merge tables (move all orders from source to target)
   */
  static async mergeTables(tenantId: string, sourceTableId: string, targetTableId: string) {
    return prisma.$transaction(async (tx) => {
      // Get both tables
      const [sourceTable, targetTable] = await Promise.all([
        tx.table.findFirst({ where: { id: sourceTableId, tenantId } }),
        tx.table.findFirst({ where: { id: targetTableId, tenantId } }),
      ])

      if (!sourceTable || !targetTable) {
        throw new Error("Table not found")
      }

      // Move all active orders from source to target
      await tx.order.updateMany({
        where: {
          tableId: sourceTableId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        data: { tableId: targetTableId },
      })

      // Update table statuses
      await tx.table.update({
        where: { id: sourceTableId },
        data: { status: TableStatus.AVAILABLE },
      })

      await tx.table.update({
        where: { id: targetTableId },
        data: { status: TableStatus.OCCUPIED },
      })

      return {
        sourceTable,
        targetTable,
      }
    })
  }

  /**
   * Get bill history/transactions for an invoice
   */
  static async getBillHistory(tenantId: string, invoiceId: string) {
    return prisma.billTransaction.findMany({
      where: {
        tenantId,
        OR: [
          { invoiceId },
          { sourceInvoiceId: invoiceId },
          { targetInvoiceId: invoiceId },
        ],
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }
}

export default BillService
