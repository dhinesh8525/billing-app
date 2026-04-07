/**
 * Product by ID API Route
 *
 * GET /api/products/[id] - Get a product by ID (tenant-scoped)
 * PUT /api/products/[id] - Update a product (tenant-scoped)
 * DELETE /api/products/[id] - Soft delete a product (tenant admin only)
 */

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import { updateProductSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
  requireTenantAdmin,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params

    const product = await ProductService.getById(tenantId, id)

    return apiResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params

    const body = await parseBody(request, updateProductSchema)
    const product = await ProductService.update(tenantId, id, body)

    return apiResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Only tenant admins can delete products
    const { tenantId } = await requireTenantAdmin()
    const { id } = await params

    const product = await ProductService.delete(tenantId, id)

    return apiResponse({ message: "Product deleted", product })
  } catch (error) {
    return handleApiError(error)
  }
}
