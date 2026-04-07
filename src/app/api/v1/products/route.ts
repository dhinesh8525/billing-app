/**
 * Public API - Products
 *
 * GET /api/v1/products - List products
 * POST /api/v1/products - Create a product
 */

import { NextRequest } from "next/server"
import { authenticateApiRequest, apiSuccess, apiError, apiPaginated } from "@/lib/api-auth"
import { ProductService } from "@/services"
import { prisma } from "@/lib/db"
import { z } from "zod"

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
})

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  description: z.string().optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.string().default("pcs"),
  hsn: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  categoryId: z.string().optional(),
})

/**
 * GET /api/v1/products
 * List products with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "read:products")
  if (!auth.success) return auth.response

  try {
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 20,
      search: searchParams.get("search") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      active: searchParams.get("active") || undefined,
    })

    const where: Record<string, unknown> = {
      tenantId: auth.context.tenantId,
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ]
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId
    }

    if (query.active !== undefined) {
      where.isActive = query.active === "true"
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          description: true,
          price: true,
          costPrice: true,
          stock: true,
          minStock: true,
          unit: true,
          hsn: true,
          taxRate: true,
          categoryId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    // Transform Decimal to number
    const data = products.map((p) => ({
      ...p,
      price: Number(p.price),
      costPrice: p.costPrice ? Number(p.costPrice) : null,
      taxRate: p.taxRate ? Number(p.taxRate) : null,
    }))

    return apiPaginated(data, {
      page: query.page,
      pageSize: query.pageSize,
      total,
    })
  } catch (error) {
    console.error("API v1 products list error:", error)
    return apiError("INTERNAL_ERROR", "Failed to list products", 500)
  }
}

/**
 * POST /api/v1/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, "write:products")
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const validation = createProductSchema.safeParse(body)

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400
      )
    }

    const product = await ProductService.create(
      auth.context.tenantId,
      validation.data
    )

    return apiSuccess(
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: Number(product.price),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit,
        hsn: product.hsn,
        taxRate: product.taxRate ? Number(product.taxRate) : null,
        categoryId: product.categoryId,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
      201
    )
  } catch (error) {
    console.error("API v1 product create error:", error)

    if (error instanceof Error && error.message.includes("SKU")) {
      return apiError("DUPLICATE_SKU", "A product with this SKU already exists", 409)
    }

    return apiError("INTERNAL_ERROR", "Failed to create product", 500)
  }
}
