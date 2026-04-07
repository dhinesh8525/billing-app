/**
 * Products API Route
 *
 * GET /api/products - List products with filtering (tenant-scoped)
 * POST /api/products - Create a new product (tenant-scoped)
 */

import { NextRequest } from "next/server"
import { ProductService } from "@/services"
import { createProductSchema, productSearchSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { UsageService } from "@/services/usage.service"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, productSearchSchema)
    const result = await ProductService.list(tenantId, query)

    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()

    // Check usage limits before creating
    const canCreate = await UsageService.canPerformAction(tenantId, "PRODUCTS")
    if (!canCreate.allowed) {
      return apiResponse({ error: canCreate.reason }, 403)
    }

    const body = await parseBody(request, createProductSchema)
    const product = await ProductService.create(tenantId, body)

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId,
      userId,
      action: "CREATE",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
      },
      ipAddress,
      userAgent,
    })

    return apiResponse(product, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
