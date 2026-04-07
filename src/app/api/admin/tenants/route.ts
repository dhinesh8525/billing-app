/**
 * Admin Tenants API Route
 *
 * GET /api/admin/tenants - List all tenants
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/auth"
import { AdminService } from "@/services"

/**
 * GET /api/admin/tenants
 * List all tenants with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireSystemAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search") || undefined
    const status = (searchParams.get("status") || "all") as "active" | "inactive" | "all"
    const planId = searchParams.get("planId") || undefined
    const sortBy = (searchParams.get("sortBy") || "createdAt") as "name" | "createdAt"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"

    const result = await AdminService.listTenants({
      page,
      pageSize,
      search,
      status,
      planId,
      sortBy,
      sortOrder,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Failed to fetch tenants:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch tenants"
    const status = message.includes("Admin") || message.includes("authenticated") ? 403 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
