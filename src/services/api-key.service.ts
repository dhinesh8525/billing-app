/**
 * API Key Service
 *
 * Manages API keys for public API access.
 */

import { prisma } from "@/lib/db"
import { createHash, randomBytes } from "crypto"

export type ApiScope =
  | "read:products"
  | "write:products"
  | "read:invoices"
  | "write:invoices"
  | "read:parties"
  | "write:parties"
  | "read:reports"

export const ALL_SCOPES: ApiScope[] = [
  "read:products",
  "write:products",
  "read:invoices",
  "write:invoices",
  "read:parties",
  "write:parties",
  "read:reports",
]

export interface ApiKeyInfo {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

interface CreateApiKeyResult {
  id: string
  key: string // The actual key - only shown once
  name: string
  keyPrefix: string
  scopes: string[]
}

/**
 * Hash an API key using SHA-256
 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/**
 * Generate a secure API key
 * Format: sk_live_<32 random chars>
 */
function generateApiKey(): string {
  const randomPart = randomBytes(24).toString("base64url")
  return `sk_live_${randomPart}`
}

export class ApiKeyService {
  /**
   * Create a new API key
   */
  static async createKey(
    tenantId: string,
    userId: string,
    name: string,
    scopes: ApiScope[],
    expiresAt?: Date
  ): Promise<CreateApiKeyResult> {
    // Generate the key
    const key = generateApiKey()
    const keyHash = hashKey(key)
    const keyPrefix = key.slice(0, 12) // "sk_live_xxxx"

    // Create the key record
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt,
        createdById: userId,
        isActive: true,
      },
    })

    return {
      id: apiKey.id,
      key, // Return the actual key only on creation
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
    }
  }

  /**
   * List all API keys for a tenant (without the actual keys)
   */
  static async listKeys(tenantId: string): Promise<ApiKeyInfo[]> {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return keys
  }

  /**
   * Get a single API key info
   */
  static async getKey(tenantId: string, keyId: string): Promise<ApiKeyInfo | null> {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return key
  }

  /**
   * Validate an API key and return tenant info if valid
   */
  static async validateKey(key: string): Promise<{
    valid: boolean
    tenantId?: string
    scopes?: string[]
    error?: string
  }> {
    const keyHash = hashKey(key)

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    })

    if (!apiKey) {
      return { valid: false, error: "Invalid API key" }
    }

    if (!apiKey.isActive) {
      return { valid: false, error: "API key has been revoked" }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: "API key has expired" }
    }

    // Update last used timestamp (non-blocking)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors - this is non-critical
      })

    return {
      valid: true,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
    }
  }

  /**
   * Revoke an API key
   */
  static async revokeKey(tenantId: string, keyId: string): Promise<boolean> {
    const result = await prisma.apiKey.updateMany({
      where: { id: keyId, tenantId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    })

    return result.count > 0
  }

  /**
   * Update API key name or scopes
   */
  static async updateKey(
    tenantId: string,
    keyId: string,
    data: { name?: string; scopes?: ApiScope[] }
  ): Promise<ApiKeyInfo | null> {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, tenantId },
    })

    if (!key) return null

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        name: data.name ?? key.name,
        scopes: data.scopes ?? key.scopes,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return updated
  }

  /**
   * Delete an API key permanently
   */
  static async deleteKey(tenantId: string, keyId: string): Promise<boolean> {
    const result = await prisma.apiKey.deleteMany({
      where: { id: keyId, tenantId },
    })

    return result.count > 0
  }

  /**
   * Check if a scope is allowed for given scopes
   */
  static hasScope(allowedScopes: string[], requiredScope: ApiScope): boolean {
    return allowedScopes.includes(requiredScope)
  }

  /**
   * Get count of active keys for a tenant
   */
  static async getActiveKeyCount(tenantId: string): Promise<number> {
    return prisma.apiKey.count({
      where: { tenantId, isActive: true },
    })
  }
}
