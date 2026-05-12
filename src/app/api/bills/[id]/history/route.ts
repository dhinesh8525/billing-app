/**
 * Bill History API Route
 *
 * GET /api/bills/[id]/history - Get split/merge history for an invoice
 */

import { NextRequest } from "next/server"
import { BillService } from "@/services/bill.service"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant()
    const { id } = await params
    const history = await BillService.getBillHistory(tenantId, id)
    return apiResponse(history)
  } catch (error) {
    return handleApiError(error)
  }
}
