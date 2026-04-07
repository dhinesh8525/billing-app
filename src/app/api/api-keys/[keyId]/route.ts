/**
 * Single API Key Routes
 *
 * GET /api/api-keys/[keyId] - Get API key details
 * PATCH /api/api-keys/[keyId] - Update API key
 * DELETE /api/api-keys/[keyId] - Revoke/delete API key
 */

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { ApiKeyService, ALL_SCOPES, type ApiScope } from "@/services/api-key.service"
import { AuditService, getRequestContext } from "@/services/audit.service"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ keyId: string }>
}

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(ALL_SCOPES as [ApiScope, ...ApiScope[]])).min(1).optional(),
})

/**
 * GET /api/api-keys/[keyId]
 * Get details of a specific API key
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { keyId } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    const key = await ApiKeyService.getKey(session.user.tenantId, keyId)

    if (!key) {
      return NextResponse.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: key,
    })
  } catch (error) {
    console.error("Failed to get API key:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get API key" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/api-keys/[keyId]
 * Update API key name or scopes
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { keyId } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = updateKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await ApiKeyService.updateKey(
      session.user.tenantId,
      keyId,
      validation.data
    )

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      )
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "SETTINGS",
      entityId: keyId,
      metadata: {
        type: "api_key",
        name: updated.name,
        changes: Object.keys(validation.data).join(", "),
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: "API key updated",
    })
  } catch (error) {
    console.error("Failed to update API key:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update API key" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/api-keys/[keyId]
 * Revoke an API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    const { keyId } = await params

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const role = session.user.tenantRole
    if (!role || !["OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    // Get key info before revoking for audit log
    const key = await ApiKeyService.getKey(session.user.tenantId, keyId)

    const revoked = await ApiKeyService.revokeKey(session.user.tenantId, keyId)

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      )
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request)
    await AuditService.log({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "SETTINGS",
      entityId: keyId,
      metadata: {
        type: "api_key",
        name: key?.name || "unknown",
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: "API key revoked",
    })
  } catch (error) {
    console.error("Failed to revoke API key:", error)
    return NextResponse.json(
      { success: false, error: "Failed to revoke API key" },
      { status: 500 }
    )
  }
}
