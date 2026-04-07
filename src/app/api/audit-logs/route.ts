/**
 * Audit Logs API
 *
 * GET /api/audit-logs - Get audit logs for current tenant
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AuditService, type AuditAction, type EntityType } from "@/services/audit.service"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "No workspace selected" },
        { status: 400 }
      )
    }

    // Check if user has permission to view audit logs (OWNER or ADMIN)
    const memberRole = session.user.tenantRole
    if (!memberRole || !["OWNER", "ADMIN"].includes(memberRole)) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50"), 100)
    const action = searchParams.get("action") as AuditAction | null
    const entityType = searchParams.get("entityType") as EntityType | null
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const filters: {
      tenantId: string
      action?: AuditAction
      entityType?: EntityType
      startDate?: Date
      endDate?: Date
    } = { tenantId }

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
    console.error("Audit logs API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
