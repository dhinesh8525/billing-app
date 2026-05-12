/**
 * Table Service
 *
 * Business logic for floor plan and table management.
 * Implements table status management, floor plan CRUD, and table positioning.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { Prisma, TableStatus } from "@prisma/client"
import {
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
  CreateTableInput,
  UpdateTableInput,
  TableQuery,
} from "@/validations/table.schema"

export class TableService {
  // ==========================================================================
  // FLOOR PLAN OPERATIONS
  // ==========================================================================

  /**
   * Create a new floor plan
   */
  static async createFloorPlan(tenantId: string, data: CreateFloorPlanInput) {
    const layout = data.layout || { width: 800, height: 600, gridSize: 20 }

    return prisma.floorPlan.create({
      data: {
        tenantId,
        name: data.name,
        layout,
        isActive: data.isActive ?? true,
      },
      include: {
        tables: true,
        _count: { select: { tables: true } },
      },
    })
  }

  /**
   * Get floor plan by ID
   */
  static async getFloorPlanById(tenantId: string, id: string) {
    const floorPlan = await prisma.floorPlan.findFirst({
      where: { id, tenantId },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { tableNumber: "asc" },
        },
        _count: { select: { tables: true } },
      },
    })

    if (!floorPlan) {
      throw new Error("Floor plan not found")
    }

    return floorPlan
  }

  /**
   * List floor plans for a tenant
   */
  static async listFloorPlans(tenantId: string, includeInactive = false) {
    return prisma.floorPlan.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { tables: true } },
      },
      orderBy: { name: "asc" },
    })
  }

  /**
   * Update a floor plan
   */
  static async updateFloorPlan(tenantId: string, id: string, data: UpdateFloorPlanInput) {
    const existing = await prisma.floorPlan.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Floor plan not found")
    }

    return prisma.floorPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.layout && { layout: data.layout }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        tables: true,
        _count: { select: { tables: true } },
      },
    })
  }

  /**
   * Delete a floor plan (soft delete by deactivating)
   */
  static async deleteFloorPlan(tenantId: string, id: string) {
    const existing = await prisma.floorPlan.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { tables: true } } },
    })

    if (!existing) {
      throw new Error("Floor plan not found")
    }

    // Soft delete - just deactivate
    return prisma.floorPlan.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // ==========================================================================
  // TABLE OPERATIONS
  // ==========================================================================

  /**
   * Create a new table
   */
  static async createTable(tenantId: string, data: CreateTableInput) {
    // Verify floor plan exists
    const floorPlan = await prisma.floorPlan.findFirst({
      where: { id: data.floorPlanId, tenantId },
    })

    if (!floorPlan) {
      throw new Error("Floor plan not found")
    }

    return prisma.table.create({
      data: {
        tenantId,
        floorPlanId: data.floorPlanId,
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        x: data.x ?? 0,
        y: data.y ?? 0,
        shape: data.shape ?? "square",
        isActive: data.isActive ?? true,
      },
      include: {
        floorPlan: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    })
  }

  /**
   * Get table by ID
   */
  static async getTableById(tenantId: string, id: string) {
    const table = await prisma.table.findFirst({
      where: { id, tenantId },
      include: {
        floorPlan: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            items: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!table) {
      throw new Error("Table not found")
    }

    return table
  }

  /**
   * List tables with filtering
   */
  static async listTables(tenantId: string, query: TableQuery) {
    const { floorPlanId, status, isActive, page = 1, pageSize = 50 } = query

    const where: Prisma.TableWhereInput = {
      tenantId,
      ...(floorPlanId && { floorPlanId }),
      ...(status && { status }),
      ...(isActive !== undefined && { isActive }),
    }

    const [total, tables] = await Promise.all([
      prisma.table.count({ where }),
      prisma.table.findMany({
        where,
        include: {
          floorPlan: { select: { id: true, name: true } },
          orders: {
            where: {
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              guestCount: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          },
        },
        orderBy: { tableNumber: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: tables,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Update a table
   */
  static async updateTable(tenantId: string, id: string, data: UpdateTableInput) {
    const existing = await prisma.table.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Table not found")
    }

    return prisma.table.update({
      where: { id },
      data: {
        ...(data.tableNumber && { tableNumber: data.tableNumber }),
        ...(data.capacity && { capacity: data.capacity }),
        ...(data.x !== undefined && { x: data.x }),
        ...(data.y !== undefined && { y: data.y }),
        ...(data.shape && { shape: data.shape }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        floorPlan: { select: { id: true, name: true } },
      },
    })
  }

  /**
   * Update table status
   */
  static async updateTableStatus(tenantId: string, id: string, status: TableStatus) {
    const existing = await prisma.table.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Table not found")
    }

    return prisma.table.update({
      where: { id },
      data: { status },
      include: {
        floorPlan: { select: { id: true, name: true } },
      },
    })
  }

  /**
   * Delete a table (soft delete)
   */
  static async deleteTable(tenantId: string, id: string) {
    const existing = await prisma.table.findFirst({
      where: { id, tenantId },
      include: {
        orders: {
          where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        },
      },
    })

    if (!existing) {
      throw new Error("Table not found")
    }

    if (existing.orders.length > 0) {
      throw new Error("Cannot delete table with active orders")
    }

    return prisma.table.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Get table status summary for dashboard
   */
  static async getTableStatusSummary(tenantId: string, floorPlanId?: string) {
    const where: Prisma.TableWhereInput = {
      tenantId,
      isActive: true,
      ...(floorPlanId && { floorPlanId }),
    }

    const [available, occupied, reserved, billing, cleaning, total] = await Promise.all([
      prisma.table.count({ where: { ...where, status: "AVAILABLE" } }),
      prisma.table.count({ where: { ...where, status: "OCCUPIED" } }),
      prisma.table.count({ where: { ...where, status: "RESERVED" } }),
      prisma.table.count({ where: { ...where, status: "BILLING" } }),
      prisma.table.count({ where: { ...where, status: "CLEANING" } }),
      prisma.table.count({ where }),
    ])

    return {
      available,
      occupied,
      reserved,
      billing,
      cleaning,
      total,
    }
  }

  /**
   * Get available tables for seating
   */
  static async getAvailableTables(tenantId: string, minCapacity?: number) {
    return prisma.table.findMany({
      where: {
        tenantId,
        isActive: true,
        status: "AVAILABLE",
        ...(minCapacity && { capacity: { gte: minCapacity } }),
      },
      include: {
        floorPlan: { select: { id: true, name: true } },
      },
      orderBy: [{ capacity: "asc" }, { tableNumber: "asc" }],
    })
  }

  /**
   * Bulk update table positions (for drag-drop editor)
   */
  static async updateTablePositions(
    tenantId: string,
    updates: Array<{ id: string; x: number; y: number }>
  ) {
    // Verify all tables belong to tenant
    const tableIds = updates.map((u) => u.id)
    const tables = await prisma.table.findMany({
      where: { id: { in: tableIds }, tenantId },
    })

    if (tables.length !== tableIds.length) {
      throw new Error("Some tables not found or not authorized")
    }

    // Update positions in transaction
    return prisma.$transaction(
      updates.map((update) =>
        prisma.table.update({
          where: { id: update.id },
          data: { x: update.x, y: update.y },
        })
      )
    )
  }
}

export default TableService
