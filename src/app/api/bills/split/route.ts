/**
 * Bill Split API Route
 *
 * POST /api/bills/split - Split a bill
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { BillService } from "@/services/bill.service"
import {
  splitByItemsSchema,
  splitEquallySchema,
  splitByPercentageSchema,
} from "@/validations"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

const splitRequestSchema = z.object({
  type: z.enum(["items", "equal", "percentage"]),
  invoiceId: z.string().cuid(),
  // For items split
  splits: z.array(
    z.object({
      itemIds: z.array(z.string()).optional(),
      customerName: z.string().max(100).optional().nullable(),
      percentage: z.number().positive().max(100).optional(),
    })
  ).optional(),
  // For equal split
  numberOfSplits: z.number().int().min(2).max(20).optional(),
  customerNames: z.array(z.string().max(100)).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()
    const body = await request.json()
    const parsed = splitRequestSchema.parse(body)

    let result

    switch (parsed.type) {
      case "items": {
        const data = splitByItemsSchema.parse({
          invoiceId: parsed.invoiceId,
          splits: parsed.splits?.map((s) => ({
            itemIds: s.itemIds || [],
            customerName: s.customerName,
          })),
        })
        result = await BillService.splitByItems(tenantId, data, userId)
        break
      }
      case "equal": {
        const data = splitEquallySchema.parse({
          invoiceId: parsed.invoiceId,
          numberOfSplits: parsed.numberOfSplits,
          customerNames: parsed.customerNames,
        })
        result = await BillService.splitEqually(tenantId, data, userId)
        break
      }
      case "percentage": {
        const data = splitByPercentageSchema.parse({
          invoiceId: parsed.invoiceId,
          splits: parsed.splits?.map((s) => ({
            percentage: s.percentage || 0,
            customerName: s.customerName,
          })),
        })
        result = await BillService.splitByPercentage(tenantId, data, userId)
        break
      }
      default:
        throw new Error("Invalid split type")
    }

    return apiResponse(result, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
