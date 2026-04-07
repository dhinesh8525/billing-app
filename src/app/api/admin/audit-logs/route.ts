/**
 * Admin Audit Logs API
 *
 * GET /api/admin/audit-logs - Get platform-wide audit logs
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AuditService, type AuditAction, type EntityType } from "@/services/audit.service"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50"), 100)
    const action = searchParams.get("action") as AuditAction | null
    const entityType = searchParams.get("entityType") as EntityType | null
    const tenantId = searchParams.get("tenantId")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const filters: {
      tenantId?: string
      userId?: string
      action?: AuditAction
      entityType?: EntityType
      startDate?: Date
      endDate?: Date
    } = {}

    if (tenantId) filters.tenantId = tenantId
    if (userId) filters.userId = userId
    if (action) filters.action = action
    if (entityType) filters.entityType = entityType
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)

    const result = await AuditService.getLogs(filters, { page, pageSize })

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error("Admin audit logs API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
