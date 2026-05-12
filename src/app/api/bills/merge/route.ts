/**
 * Bill Merge API Route
 *
 * POST /api/bills/merge - Merge multiple bills into one
 */

import { NextRequest } from "next/server"
import { BillService } from "@/services/bill.service"
import { mergeBillsSchema } from "@/validations"
import {
  apiResponse,
  handleApiError,
  parseBody,
  requireTenant,
} from "@/lib/api-utils-tenant"

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()
    const body = await parseBody(request, mergeBillsSchema)
    const result = await BillService.mergeBills(tenantId, body, userId)
    return apiResponse(result, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
