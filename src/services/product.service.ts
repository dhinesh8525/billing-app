/**
 * Product Service
 *
 * Business logic for product management including CRUD operations,
 * search functionality, and inventory management.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 * FEATURE GATED: Product creation respects plan limits
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  CreateProductInput,
  UpdateProductInput,
  ProductSearchQuery,
} from "@/validations/product.schema"
import { canCreateProduct } from "@/lib/feature-gate"

/**
 * Product Service class with static methods for product operations
 * All methods require tenantId for multi-tenant isolation
 */
export class ProductService {
  /**
   * Create a new product
   * FEATURE GATED: Checks plan limit before creation
   */
  static async create(tenantId: string, data: CreateProductInput) {
    // Check plan limits
    const limitCheck = await canCreateProduct(tenantId)
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || "Product limit reached. Please upgrade your plan.")
    }

    // Check for duplicate SKU within tenant
    const existing = await prisma.product.findUnique({
      where: {
        tenantId_sku: { tenantId, sku: data.sku },
      },
    })

    if (existing) {
      throw new Error(`Product with SKU "${data.sku}" already exists`)
    }

    return prisma.product.create({
      data: {
        tenantId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 5,
        unit: data.unit ?? "pcs",
        hsn: data.hsn,
        taxRate: data.taxRate,
        categoryId: data.categoryId,
      },
      include: { category: true },
    })
  }

  /**
   * Get a product by ID (tenant-scoped)
   */
  static async getById(tenantId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true },
    })

    if (!product) {
      throw new Error("Product not found")
    }

    return product
  }

  /**
   * Get a product by SKU (tenant-scoped)
   */
  static async getBySku(tenantId: string, sku: string) {
    return prisma.product.findUnique({
      where: {
        tenantId_sku: { tenantId, sku },
      },
      include: { category: true },
    })
  }

  /**
   * Update a product (tenant-scoped)
   */
  static async update(tenantId: string, id: string, data: UpdateProductInput) {
    // Check if product exists in this tenant
    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Product not found")
    }

    // Check for SKU conflict if SKU is being updated
    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({
        where: {
          tenantId_sku: { tenantId, sku: data.sku },
        },
      })
      if (skuExists) {
        throw new Error(`Product with SKU "${data.sku}" already exists`)
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.hsn !== undefined && { hsn: data.hsn }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { category: true },
    })
  }

  /**
   * Soft delete a product (tenant-scoped)
   */
  static async delete(tenantId: string, id: string) {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Product not found")
    }

    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * List products with filtering, sorting, and pagination (tenant-scoped)
   */
  static async list(tenantId: string, query: ProductSearchQuery) {
    const {
      q: search,
      categoryId,
      isActive = true,
      lowStock,
      page = 1,
      pageSize = 20,
      sortBy = "name",
      sortOrder = "asc",
    } = query

    // Build where clause with tenant scope
    const where: Prisma.ProductWhereInput = {
      tenantId, // CRITICAL: Always filter by tenant
      isActive,
      ...(categoryId && { categoryId }),
      ...(lowStock && {
        stock: { lte: prisma.product.fields.minStock },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    // Execute count and find in parallel
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Fast product search for autocomplete/POS (tenant-scoped)
   */
  static async search(tenantId: string, query: string, limit = 10) {
    if (!query || query.length < 1) {
      return []
    }

    return prisma.product.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { startsWith: query, mode: "insensitive" } },
          { barcode: { equals: query } }, // Exact match for barcode scans
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        price: true,
        stock: true,
        unit: true,
        taxRate: true,
        hsn: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    })
  }

  /**
   * Get low stock products (tenant-scoped)
   */
  static async getLowStock(tenantId: string, limit = 10) {
    return prisma.product.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
        isActive: true,
        stock: { lte: prisma.product.fields.minStock },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minStock: true,
        unit: true,
      },
      orderBy: { stock: "asc" },
      take: limit,
    })
  }

  /**
   * Adjust product stock (tenant-scoped)
   */
  static async adjustStock(tenantId: string, productId: string, quantity: number) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    })

    if (!product) {
      throw new Error("Product not found")
    }

    const newStock = product.stock + quantity
    if (newStock < 0) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`)
    }

    return prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    })
  }

  /**
   * Calculate total stock value (tenant-scoped)
   */
  static async getStockValue(tenantId: string) {
    const products = await prisma.product.findMany({
      where: {
        tenantId, // CRITICAL: Always filter by tenant
        isActive: true,
        stock: { gt: 0 },
      },
      select: {
        stock: true,
        costPrice: true,
        price: true,
      },
    })

    return products.reduce((total, product) => {
      const unitCost = product.costPrice
        ? Number(product.costPrice)
        : Number(product.price)
      return total + product.stock * unitCost
    }, 0)
  }

  /**
   * Get all categories (tenant-scoped)
   */
  static async getCategories(tenantId: string) {
    return prisma.category.findMany({
      where: { tenantId }, // CRITICAL: Always filter by tenant
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    })
  }

  /**
   * Create a category (tenant-scoped)
   */
  static async createCategory(tenantId: string, name: string, description?: string) {
    // Check for duplicate within tenant
    const existing = await prisma.category.findUnique({
      where: {
        tenantId_name: { tenantId, name },
      },
    })

    if (existing) {
      throw new Error(`Category "${name}" already exists`)
    }

    return prisma.category.create({
      data: { tenantId, name, description },
    })
  }

  /**
   * Delete a category (tenant-scoped)
   */
  static async deleteCategory(tenantId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      throw new Error("Category not found")
    }

    if (category._count.products > 0) {
      throw new Error(
        `Cannot delete category with ${category._count.products} products. Remove products first.`
      )
    }

    return prisma.category.delete({ where: { id } })
  }

  /**
   * Get product count for a tenant (for feature gating)
   */
  static async getProductCount(tenantId: string) {
    return prisma.product.count({
      where: { tenantId, isActive: true },
    })
  }
}

export default ProductService
