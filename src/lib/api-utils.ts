/**
 * API Utilities
 *
 * Helper functions for API route handlers.
 */

import { NextResponse } from "next/server"
import { ZodError, ZodSchema } from "zod"
import { getSession } from "./auth"

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
    if (error.message.includes("Admin access")) {
      return apiError("Admin access required", 403)
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
 * Require admin role for API route
 */
export async function requireAdminAuth() {
  const session = await requireAuth()

  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return session
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
