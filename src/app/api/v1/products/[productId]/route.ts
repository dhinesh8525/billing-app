/**
 * Public API - Single Product
 *
 * GET /api/v1/products/[productId] - Get product details
 * PUT /api/v1/products/[productId] - Update product
 * DELETE /api/v1/products/[productId] - Delete product
 */

import { NextRequest } from "next/server"
import { authenticateApiRequest, apiSuccess, apiError } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ productId: string }>
}

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  hsn: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/v1/products/[productId]
 * Get a single product by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request, "read:products")
  if (!auth.success) return auth.response

  try {
    const { productId } = await params

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: auth.context.tenantId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    })

    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404)
    }

    return apiSuccess({
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
      category: product.category,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
  } catch (error) {
    console.error("API v1 product get error:", error)
    return apiError("INTERNAL_ERROR", "Failed to get product", 500)
  }
}

/**
 * PUT /api/v1/products/[productId]
 * Update a product
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request, "write:products")
  if (!auth.success) return auth.response

  try {
    const { productId } = await params
    const body = await request.json()
    const validation = updateProductSchema.safeParse(body)

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400
      )
    }

    // Check product exists and belongs to tenant
    const existing = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: auth.context.tenantId,
      },
    })

    if (!existing) {
      return apiError("NOT_FOUND", "Product not found", 404)
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: validation.data,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    })

    return apiSuccess({
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
      category: product.category,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
  } catch (error) {
    console.error("API v1 product update error:", error)
    return apiError("INTERNAL_ERROR", "Failed to update product", 500)
  }
}

/**
 * DELETE /api/v1/products/[productId]
 * Soft delete a product
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request, "write:products")
  if (!auth.success) return auth.response

  try {
    const { productId } = await params

    // Check product exists and belongs to tenant
    const existing = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: auth.context.tenantId,
      },
    })

    if (!existing) {
      return apiError("NOT_FOUND", "Product not found", 404)
    }

    // Soft delete
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error("API v1 product delete error:", error)
    return apiError("INTERNAL_ERROR", "Failed to delete product", 500)
  }
}
