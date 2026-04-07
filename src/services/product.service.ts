/**
 * Product Service
 *
 * Business logic for product management including CRUD operations,
 * search functionality, and inventory management.
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  CreateProductInput,
  UpdateProductInput,
  ProductSearchQuery,
} from "@/validations/product.schema"

/**
 * Product Service class with static methods for product operations
 */
export class ProductService {
  /**
   * Create a new product
   */
  static async create(data: CreateProductInput) {
    // Check for duplicate SKU
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    })

    if (existing) {
      throw new Error(`Product with SKU "${data.sku}" already exists`)
    }

    return prisma.product.create({
      data: {
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
   * Get a product by ID
   */
  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!product) {
      throw new Error("Product not found")
    }

    return product
  }

  /**
   * Get a product by SKU
   */
  static async getBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku },
      include: { category: true },
    })
  }

  /**
   * Update a product
   */
  static async update(id: string, data: UpdateProductInput) {
    // Check if product exists
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new Error("Product not found")
    }

    // Check for SKU conflict if SKU is being updated
    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: data.sku },
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
   * Soft delete a product (set isActive to false)
   */
  static async delete(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new Error("Product not found")
    }

    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * List products with filtering, sorting, and pagination
   */
  static async list(query: ProductSearchQuery) {
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

    // Build where clause
    const where: Prisma.ProductWhereInput = {
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
   * Fast product search for autocomplete/POS
   * Optimized for speed with limited fields
   */
  static async search(query: string, limit = 10) {
    if (!query || query.length < 1) {
      return []
    }

    return prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { startsWith: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
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
   * Get low stock products
   */
  static async getLowStock(limit = 10) {
    return prisma.product.findMany({
      where: {
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
   * Adjust product stock
   * Returns the updated product
   */
  static async adjustStock(productId: string, quantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
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
   * Calculate total stock value
   */
  static async getStockValue() {
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
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
   * Get all categories
   */
  static async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    })
  }

  /**
   * Create a category
   */
  static async createCategory(name: string, description?: string) {
    return prisma.category.create({
      data: { name, description },
    })
  }

  /**
   * Delete a category (only if no products are linked)
   */
  static async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
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
}

export default ProductService
