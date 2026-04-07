/**
 * Party Service
 *
 * Business logic for customer/supplier (party) management.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 * FEATURE GATED: Party creation respects plan limits
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  CreatePartyInput,
  UpdatePartyInput,
  PartyQuery,
} from "@/validations/party.schema"
import { canAddParty } from "@/lib/feature-gate"

/**
 * Party Service class with static methods for party operations
 * All methods require tenantId for multi-tenant isolation
 */
export class PartyService {
  /**
   * Create a new party (tenant-scoped)
   * FEATURE GATED: Checks plan limit before creation
   */
  static async create(tenantId: string, data: CreatePartyInput) {
    // Check plan limits
    const limitCheck = await canAddParty(tenantId)
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || "Party limit reached. Please upgrade your plan.")
    }

    // Check for duplicate phone number within tenant
    if (data.phone) {
      const existing = await prisma.party.findFirst({
        where: { phone: data.phone, tenantId },
      })

      if (existing) {
        throw new Error(`Party with phone "${data.phone}" already exists`)
      }
    }

    return prisma.party.create({
      data: {
        tenantId, // CRITICAL: Always include tenant
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
   * Get a party by ID (tenant-scoped)
   */
  static async getById(tenantId: string, id: string) {
    const party = await prisma.party.findFirst({
      where: { id, tenantId }, // CRITICAL: Always filter by tenant
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
   * Get a party by phone number (tenant-scoped)
   */
  static async getByPhone(tenantId: string, phone: string) {
    return prisma.party.findFirst({
      where: { phone, tenantId }, // CRITICAL: Always filter by tenant
    })
  }

  /**
   * Update a party (tenant-scoped)
   */
  static async update(tenantId: string, id: string, data: UpdatePartyInput) {
    const existing = await prisma.party.findFirst({
      where: { id, tenantId }, // CRITICAL: Always filter by tenant
    })
    if (!existing) {
      throw new Error("Party not found")
    }

    // Check phone conflict if being updated (tenant-scoped)
    if (data.phone && data.phone !== existing.phone) {
      const phoneExists = await prisma.party.findFirst({
        where: { phone: data.phone, tenantId, id: { not: id } },
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
   * Soft delete a party (tenant-scoped)
   */
  static async delete(tenantId: string, id: string) {
    const existing = await prisma.party.findFirst({
      where: { id, tenantId }, // CRITICAL: Always filter by tenant
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
   * List parties with filtering and pagination (tenant-scoped)
   */
  static async list(tenantId: string, query: PartyQuery) {
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
      tenantId, // CRITICAL: Always filter by tenant
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
   * Search parties for autocomplete (tenant-scoped)
   */
  static async search(tenantId: string, query: string, type?: string, limit = 10) {
    if (!query || query.length < 1) {
      return []
    }

    return prisma.party.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
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
   * Get top receivables (customers who owe money) (tenant-scoped)
   */
  static async getReceivables(tenantId: string, limit = 10) {
    return prisma.party.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
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
   * Get top payables (suppliers we owe money to) (tenant-scoped)
   */
  static async getPayables(tenantId: string, limit = 10) {
    return prisma.party.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
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
   * Get party ledger (all transactions) (tenant-scoped)
   */
  static async getLedger(tenantId: string, partyId: string, page = 1, pageSize = 20) {
    const party = await prisma.party.findFirst({
      where: { id: partyId, tenantId }, // CRITICAL: Always filter by tenant
    })
    if (!party) {
      throw new Error("Party not found")
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where: { partyId, tenantId } }),
      prisma.invoice.findMany({
        where: { partyId, tenantId }, // CRITICAL: Always filter by tenant
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
