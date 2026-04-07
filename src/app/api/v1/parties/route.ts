/**
 * Public API - Parties (Customers/Suppliers)
 *
 * GET /api/v1/parties - List parties
 * POST /api/v1/parties - Create a party
 */

import { NextRequest } from "next/server"
import { authenticateApiRequest, apiSuccess, apiError, apiPaginated } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["customer", "supplier", "both"]).optional(),
})

const createPartySchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  type: z.enum(["customer", "supplier", "both"]).default("customer"),
  openingBalance: z.number().default(0),
  creditLimit: z.number().optional(),
  creditDays: z.number().int().min(0).default(0),
})

/**
 * GET /api/v1/parties
 * List parties with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "read:parties")
  if (!auth.success) return auth.response

  try {
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 20,
      search: searchParams.get("search") || undefined,
      type: searchParams.get("type") || undefined,
    })

    const where: Record<string, unknown> = {
      tenantId: auth.context.tenantId,
      isActive: true,
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: "insensitive" } },
      ]
    }

    if (query.type) {
      where.type = query.type
    }

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gstin: true,
          pan: true,
          billingAddress: true,
          shippingAddress: true,
          type: true,
          openingBalance: true,
          currentBalance: true,
          creditLimit: true,
          creditDays: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.party.count({ where }),
    ])

    const data = parties.map((p) => ({
      ...p,
      openingBalance: Number(p.openingBalance),
      currentBalance: Number(p.currentBalance),
      creditLimit: p.creditLimit ? Number(p.creditLimit) : null,
    }))

    return apiPaginated(data, {
      page: query.page,
      pageSize: query.pageSize,
      total,
    })
  } catch (error) {
    console.error("API v1 parties list error:", error)
    return apiError("INTERNAL_ERROR", "Failed to list parties", 500)
  }
}

/**
 * POST /api/v1/parties
 * Create a new party
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "write:parties")
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const validation = createPartySchema.safeParse(body)

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400
      )
    }

    const party = await prisma.party.create({
      data: {
        tenantId: auth.context.tenantId,
        ...validation.data,
        currentBalance: validation.data.openingBalance,
      },
    })

    return apiSuccess(
      {
        id: party.id,
        name: party.name,
        phone: party.phone,
        email: party.email,
        gstin: party.gstin,
        pan: party.pan,
        billingAddress: party.billingAddress,
        shippingAddress: party.shippingAddress,
        type: party.type,
        openingBalance: Number(party.openingBalance),
        currentBalance: Number(party.currentBalance),
        creditLimit: party.creditLimit ? Number(party.creditLimit) : null,
        creditDays: party.creditDays,
        createdAt: party.createdAt,
        updatedAt: party.updatedAt,
      },
      201
    )
  } catch (error) {
    console.error("API v1 party create error:", error)

    if (error instanceof Error && error.message.includes("phone")) {
      return apiError("DUPLICATE_PHONE", "A party with this phone number already exists", 409)
    }

    return apiError("INTERNAL_ERROR", "Failed to create party", 500)
  }
}
