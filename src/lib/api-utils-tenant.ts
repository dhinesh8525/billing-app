/**
 * Tenant-Aware API Utilities
 *
 * Helper functions for API route handlers with multi-tenant support.
 * All API routes should use these to ensure tenant isolation.
 */

import { NextResponse } from "next/server"
import { ZodError, ZodSchema } from "zod"
import { getSession } from "./auth"
import { getTenantContext, TenantContext } from "./tenant"

/**
 * Standard API response wrapper
 */
export function apiResponse<T>(
  data: T,
  status = 200
): NextResponse<{ success: true; data: T }> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard API error response
 */
export function apiError(
  message: string,
  status = 400
): NextResponse<{ success: false; error: string }> {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error)

  if (error instanceof ZodError) {
    const messages = error.issues.map((e) => `${String(e.path.join("."))}: ${e.message}`)
    return apiError(`Validation failed: ${messages.join(", ")}`, 400)
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("not found")) {
      return apiError(error.message, 404)
    }
    if (error.message.includes("already exists")) {
      return apiError(error.message, 409)
    }
    if (error.message.includes("Insufficient") || error.message.includes("exceeds")) {
      return apiError(error.message, 400)
    }
    if (error.message.includes("Not authenticated")) {
      return apiError("Authentication required", 401)
    }
    if (error.message.includes("Tenant context required")) {
      return apiError("No active business found. Please create or join a business.", 403)
    }
    if (error.message.includes("Admin access") || error.message.includes("Owner access")) {
      return apiError("Insufficient permissions", 403)
    }
    if (error.message.includes("limit reached") || error.message.includes("upgrade")) {
      return apiError(error.message, 402) // Payment required
    }

    return apiError(error.message, 500)
  }

  return apiError("An unexpected error occurred", 500)
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Parse URL search params with schema validation
 */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return schema.parse(params)
}

/**
 * Require authentication for API route
 * Returns the session or throws
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  return session
}

/**
 * Require authentication AND tenant context for API route
 * Returns the tenant context or throws
 *
 * USE THIS FOR ALL TENANT-SCOPED API ROUTES
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const context = await getTenantContext()

  if (!context) {
    throw new Error("Tenant context required. User must belong to an active tenant.")
  }

  return context
}

/**
 * Require tenant owner role for API route
 */
export async function requireTenantOwner(): Promise<TenantContext> {
  const context = await requireTenant()

  if (context.tenantRole !== "OWNER") {
    throw new Error("Owner access required")
  }

  return context
}

/**
 * Require tenant admin or owner role for API route
 */
export async function requireTenantAdmin(): Promise<TenantContext> {
  const context = await requireTenant()

  if (context.tenantRole !== "OWNER" && context.tenantRole !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return context
}

/**
 * Extract pagination params from URL
 */
export function getPaginationParams(searchParams: URLSearchParams) {
  return {
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
  }
}
