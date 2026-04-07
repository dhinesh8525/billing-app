/**
 * Audit Service
 *
 * Handles audit logging for important actions.
 * Provides compliance and security tracking.
 */

import { prisma } from "@/lib/db"

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "INVITE"
  | "JOIN"
  | "LEAVE"
  | "TRANSFER"
  | "SUBSCRIBE"
  | "CANCEL"
  | "PAYMENT"
  | "SETTING_CHANGE"

export type EntityType =
  | "USER"
  | "TENANT"
  | "PRODUCT"
  | "INVOICE"
  | "PARTY"
  | "CATEGORY"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "MEMBER"
  | "INVITATION"
  | "SETTINGS"
  | "PLAN"

interface AuditLogInput {
  tenantId?: string | null
  userId?: string | null
  action: AuditAction
  entityType: EntityType
  entityId?: string | null
  metadata?: Record<string, string | number | boolean | null> | null
  ipAddress?: string | null
  userAgent?: string | null
}

interface AuditLogFilters {
  tenantId?: string
  userId?: string
  action?: AuditAction
  entityType?: EntityType
  entityId?: string
  startDate?: Date
  endDate?: Date
}

interface PaginationOptions {
  page?: number
  pageSize?: number
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata ?? undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      })
    } catch (error) {
      // Log errors but don't throw - audit logging shouldn't break operations
      console.error("Failed to create audit log:", error)
    }
  }

  /**
   * Get audit logs with filters and pagination
   */
  static async getLogs(
    filters: AuditLogFilters,
    pagination: PaginationOptions = {}
  ) {
    const { page = 1, pageSize = 50 } = pagination
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (filters.tenantId) where.tenantId = filters.tenantId
    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = filters.entityId

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        ;(where.createdAt as Record<string, Date>).gte = filters.startDate
      }
      if (filters.endDate) {
        ;(where.createdAt as Record<string, Date>).lte = filters.endDate
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Get logs for a specific entity
   */
  static async getEntityHistory(entityType: EntityType, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  }

  /**
   * Get recent activity for a tenant
   */
  static async getTenantActivity(tenantId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  /**
   * Get user activity across all tenants (for admin)
   */
  static async getUserActivity(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  /**
   * Get platform-wide activity (for super admin)
   */
  static async getPlatformActivity(
    filters: { action?: AuditAction; entityType?: EntityType } = {},
    limit = 100
  ) {
    const where: Record<string, unknown> = {}
    if (filters.action) where.action = filters.action
    if (filters.entityType) where.entityType = filters.entityType

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  /**
   * Get activity summary for a tenant (last 30 days)
   */
  static async getTenantActivitySummary(tenantId: string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const logs = await prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { action: true },
    })

    return logs.map((log) => ({
      action: log.action,
      count: log._count.action,
    }))
  }

  /**
   * Delete old audit logs (retention policy)
   * Default: Keep logs for 90 days
   */
  static async cleanupOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  }
}

// Helper to extract request context
export function getRequestContext(request: Request): {
  ipAddress: string | null
  userAgent: string | null
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null

  const userAgent = request.headers.get("user-agent") || null

  return { ipAddress, userAgent }
}
