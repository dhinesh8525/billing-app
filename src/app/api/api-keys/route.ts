/**
 * API Keys Management Routes
 *
 * GET /api/api-keys - List all API keys
 * POST /api/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { ApiKeyService, ALL_SCOPES, type ApiScope } from "@/services/api-key.service"
import { UsageService } from "@/services/usage.service"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { z } from "zod"

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(ALL_SCOPES as [ApiScope, ...ApiScope[]])).min(1),
  expiresInDays: z.number().min(1).max(365).optional(),
})

/**
 * GET /api/api-keys
 * List all API keys for the current tenant
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has permission (OWNER or ADMIN only)
    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Only workspace owners and admins can manage API keys" },
        { status: 403 }
      )
    }

    const keys = await ApiKeyService.listKeys(session.user.tenantId)

    return NextResponse.json({
      success: true,
      data: keys,
    })
  } catch (error) {
    console.error("Failed to list API keys:", error)
    return NextResponse.json(
      { success: false, error: "Failed to list API keys" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has permission (OWNER or ADMIN only)
    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Only workspace owners and admins can create API keys" },
        { status: 403 }
      )
    }

    // Check if API access is enabled for this plan
    const limits = await UsageService.getPlanLimits(session.user.tenantId)
    if (!limits.apiAccess) {
      return NextResponse.json(
        { success: false, error: "API access is not available on your plan. Upgrade to use the API." },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, scopes, expiresInDays } = validation.data

    // Calculate expiration date if provided
    let expiresAt: Date | undefined
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // Create the key
    const result = await ApiKeyService.createKey(
      session.user.tenantId,
      session.user.id,
      name,
      scopes,
      expiresAt
    )

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "SETTINGS",
      entityId: result.id,
      metadata: {
        type: "api_key",
        name: result.name,
        scopes: result.scopes.join(", "),
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: "API key created. Make sure to copy it now - you won't be able to see it again!",
    })
  } catch (error) {
    console.error("Failed to create API key:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    )
  }
}
