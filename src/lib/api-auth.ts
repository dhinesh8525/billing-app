/**
 * Public API Authentication
 *
 * Middleware helpers for authenticating public API requests.
 */

import { NextRequest, NextResponse } from "next/server"
import { ApiKeyService, type ApiScope } from "@/services/api-key.service"
import { UsageService } from "@/services/usage.service"

export interface ApiContext {
  tenantId: string
  scopes: string[]
}

/**
 * Extract API key from request headers
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // Also check X-API-Key header
  const apiKeyHeader = request.headers.get("x-api-key")
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * Authenticate a public API request
 * Returns tenant context if valid, error response if not
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredScope?: ApiScope
): Promise<
  | { success: true; context: ApiContext }
  | { success: false; response: NextResponse }
> {
  const apiKey = extractApiKey(request)

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "API key required. Provide via Authorization: Bearer <key> or X-API-Key header.",
          },
        },
        { status: 401 }
      ),
    }
  }

  // Validate the key
  const validation = await ApiKeyService.validateKey(apiKey)

  if (!validation.valid || !validation.tenantId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "INVALID_API_KEY",
            message: validation.error || "Invalid API key",
          },
        },
        { status: 401 }
      ),
    }
  }

  // Check if API access is allowed for this tenant's plan
  const canUseApi = await UsageService.canPerformAction(validation.tenantId, "API_CALLS")
  if (!canUseApi.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "API_ACCESS_DENIED",
            message: canUseApi.reason || "API access not available on your plan",
          },
        },
        { status: 403 }
      ),
    }
  }

  // Check required scope
  if (requiredScope && !ApiKeyService.hasScope(validation.scopes!, requiredScope)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_SCOPE",
            message: `This endpoint requires the '${requiredScope}' scope`,
          },
        },
        { status: 403 }
      ),
    }
  }

  // Track API usage
  await UsageService.incrementUsage(validation.tenantId, "API_CALLS")

  return {
    success: true,
    context: {
      tenantId: validation.tenantId,
      scopes: validation.scopes!,
    },
  }
}

/**
 * Standard error response for public API
 */
export function apiError(
  code: string,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  )
}

/**
 * Standard success response for public API
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

/**
 * Paginated response for public API
 */
export function apiPaginated<T>(
  data: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
  }
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
      hasMore: pagination.page * pagination.pageSize < pagination.total,
    },
  })
}
