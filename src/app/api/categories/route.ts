/**
 * Categories API Route
 *
 * GET /api/categories - List all categories (tenant-scoped)
 * POST /api/categories - Create a new category (tenant-scoped, admin only)
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { ProductService } from "@/services"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
  requireTenantAdmin,
} from "@/lib/api-utils-tenant"

const createCategorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export async function GET() {
  try {
    const { tenantId } = await requireTenant()

    const categories = await ProductService.getCategories(tenantId)

    return apiResponse(categories)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantAdmin()

    const body = await parseBody(request, createCategorySchema)
    const category = await ProductService.createCategory(
      tenantId,
      body.name,
      body.description
    )

    return apiResponse(category, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
