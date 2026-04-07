/**
 * Product by ID API Route
 *
 * GET /api/products/[id] - Get a product by ID
 * PUT /api/products/[id] - Update a product
 * DELETE /api/products/[id] - Soft delete a product
 */

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import { updateProductSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireAuth,
  requireAdminAuth,
} from "@/lib/api-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const product = await ProductService.getById(id)

    return apiResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const body = await parseBody(request, updateProductSchema)
    const product = await ProductService.update(id, body)

    return apiResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Only admins can delete products
    await requireAdminAuth()
    const { id } = await params

    const product = await ProductService.delete(id)

    return apiResponse({ message: "Product deleted", product })
  } catch (error) {
    return handleApiError(error)
  }
}
