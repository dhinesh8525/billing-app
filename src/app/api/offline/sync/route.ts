/**
 * Offline Sync API Route
 *
 * POST /api/offline/sync - Batch sync queued transactions
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { OrderService } from "@/services"
import {
  apiResponse,
  handleApiError,
  requireTenant,
} from "@/lib/api-utils-tenant"

const syncRequestSchema = z.object({
  orders: z.array(z.object({
    offlineId: z.string(),
    tableId: z.string().cuid().optional().nullable(),
    orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
    specialNotes: z.string().optional().nullable(),
    guestCount: z.number().int().positive().default(1),
    items: z.array(z.object({
      productId: z.string().cuid(),
      productName: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
      notes: z.string().optional().nullable(),
      station: z.enum(["KITCHEN", "BAR", "GRILL", "DESSERT"]).optional().nullable(),
    })),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant()
    const body = await request.json()
    const data = syncRequestSchema.parse(body)

    const results = {
      orders: [] as Array<{ offlineId: string; serverId: string; success: boolean; error?: string }>,
    }

    // Sync orders
    if (data.orders && data.orders.length > 0) {
      for (const offlineOrder of data.orders) {
        try {
          const order = await OrderService.createOrder(
            tenantId,
            {
              tableId: offlineOrder.tableId,
              orderType: offlineOrder.orderType,
              specialNotes: offlineOrder.specialNotes,
              guestCount: offlineOrder.guestCount,
              items: offlineOrder.items,
            },
            userId
          )
          results.orders.push({
            offlineId: offlineOrder.offlineId,
            serverId: order.id,
            success: true,
          })
        } catch (error) {
          results.orders.push({
            offlineId: offlineOrder.offlineId,
            serverId: "",
            success: false,
            error: error instanceof Error ? error.message : "Failed to sync",
          })
        }
      }
    }

    return apiResponse({
      synced: results.orders.filter((r) => r.success).length,
      failed: results.orders.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
