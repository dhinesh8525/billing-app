/**
 * Tables API Route
 *
 * GET /api/tables - List tables with filtering
 * POST /api/tables - Create a new table
 */

import { NextRequest } from "next/server"
import { TableService } from "@/services"
import { createTableSchema, tableQuerySchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  parseSearchParams,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const searchParams = request.nextUrl.searchParams
    const query = parseSearchParams(searchParams, tableQuerySchema)
    const result = await TableService.listTables(tenantId, query)
    return apiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await parseBody(request, createTableSchema)
    const table = await TableService.createTable(tenantId, body)
    return apiResponse(table, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
