/**
 * Categories API Route
 *
 * GET /api/categories - List all categories
 * POST /api/categories - Create a new category
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { ProductService } from "@/services"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireAuth,
  requireAdminAuth,
} from "@/lib/api-utils"

const createCategorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export async function GET() {
  try {
    await requireAuth()

    const categories = await ProductService.getCategories()

    return apiResponse(categories)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await parseBody(request, createCategorySchema)
    const category = await ProductService.createCategory(
      body.name,
      body.description
    )

    return apiResponse(category, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
