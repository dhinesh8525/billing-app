/**
 * Products API Route
 *
 * GET /api/products - List products with filtering
 * POST /api/products - Create a new product
 */

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import { createProductSchema, productSearchSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireAuth,
} from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, productSearchSchema)
    const result = await ProductService.list(query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await parseBody(request, createProductSchema)
    const product = await ProductService.create(body)

    return apiResponse(product, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
