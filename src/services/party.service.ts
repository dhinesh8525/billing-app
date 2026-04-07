/**
 * Party Service
 *
 * Business logic for customer/supplier (party) management.
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  CreatePartyInput,
  UpdatePartyInput,
  PartyQuery,
} from "@/validations/party.schema"

/**
 * Party Service class with static methods for party operations
 */
export class PartyService {
  /**
   * Create a new party
   */
  static async create(data: CreatePartyInput) {
    // Check for duplicate phone number
    if (data.phone) {
      const existing = await prisma.party.findUnique({
        where: { phone: data.phone },
      })

      if (existing) {
        throw new Error(`Party with phone "${data.phone}" already exists`)
      }
    }

    return prisma.party.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        pan: data.pan,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        type: data.type ?? "customer",
        openingBalance: data.openingBalance ?? 0,
        currentBalance: data.openingBalance ?? 0,
        creditLimit: data.creditLimit,
        creditDays: data.creditDays ?? 0,
      },
    })
  }

  /**
   * Get a party by ID
   */
  static async getById(id: string) {
    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true } },
      },
    })

    if (!party) {
      throw new Error("Party not found")
    }

    return party
  }

  /**
   * Get a party by phone number
   */
  static async getByPhone(phone: string) {
    return prisma.party.findUnique({
      where: { phone },
    })
  }

  /**
   * Update a party
   */
  static async update(id: string, data: UpdatePartyInput) {
    const existing = await prisma.party.findUnique({ where: { id } })
    if (!existing) {
      throw new Error("Party not found")
    }

    // Check phone conflict if being updated
    if (data.phone && data.phone !== existing.phone) {
      const phoneExists = await prisma.party.findUnique({
        where: { phone: data.phone },
      })
      if (phoneExists) {
        throw new Error(`Party with phone "${data.phone}" already exists`)
      }
    }

    return prisma.party.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.gstin !== undefined && { gstin: data.gstin }),
        ...(data.pan !== undefined && { pan: data.pan }),
        ...(data.billingAddress !== undefined && {
          billingAddress: data.billingAddress,
        }),
        ...(data.shippingAddress !== undefined && {
          shippingAddress: data.shippingAddress,
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.creditDays !== undefined && { creditDays: data.creditDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  }

  /**
   * Soft delete a party
   */
  static async delete(id: string) {
    const existing = await prisma.party.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    })

    if (!existing) {
      throw new Error("Party not found")
    }

    if (existing._count.invoices > 0) {
      // Soft delete if has invoices
      return prisma.party.update({
        where: { id },
        data: { isActive: false },
      })
    }

    // Hard delete if no invoices
    return prisma.party.delete({ where: { id } })
  }

  /**
   * List parties with filtering and pagination
   */
  static async list(query: PartyQuery) {
    const {
      type,
      search,
      hasBalance,
      isActive = true,
      page = 1,
      pageSize = 20,
      sortBy = "name",
      sortOrder = "asc",
    } = query

    const where: Prisma.PartyWhereInput = {
      isActive,
      ...(type && { type }),
      ...(hasBalance && { currentBalance: { not: 0 } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [total, parties] = await Promise.all([
      prisma.party.count({ where }),
      prisma.party.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: parties,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Search parties for autocomplete
   */
  static async search(query: string, type?: string, limit = 10) {
    if (!query || query.length < 1) {
      return []
    }

    return prisma.party.findMany({
      where: {
        isActive: true,
        ...(type && { type: { in: [type, "both"] } }),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
        currentBalance: true,
        gstin: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    })
  }

  /**
   * Get top receivables (customers who owe money)
   */
  static async getReceivables(limit = 10) {
    return prisma.party.findMany({
      where: {
        isActive: true,
        type: { in: ["customer", "both"] },
        currentBalance: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
      },
      orderBy: { currentBalance: "desc" },
      take: limit,
    })
  }

  /**
   * Get top payables (suppliers we owe money to)
   */
  static async getPayables(limit = 10) {
    return prisma.party.findMany({
      where: {
        isActive: true,
        type: { in: ["supplier", "both"] },
        currentBalance: { lt: 0 },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
      },
      orderBy: { currentBalance: "asc" },
      take: limit,
    })
  }

  /**
   * Get party ledger (all transactions)
   */
  static async getLedger(partyId: string, page = 1, pageSize = 20) {
    const party = await prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      throw new Error("Party not found")
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where: { partyId } }),
      prisma.invoice.findMany({
        where: { partyId },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          total: true,
          amountPaid: true,
          paymentStatus: true,
          status: true,
          invoiceDate: true,
        },
        orderBy: { invoiceDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      party,
      invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }
}

export default PartyService
