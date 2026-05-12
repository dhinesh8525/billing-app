/**
 * Recipe Service
 *
 * Business logic for recipe/BOM management.
 * Handles recipe CRUD, cost calculation, and raw material deduction.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { Decimal } from "decimal.js"
import {
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeQuery,
} from "@/validations/recipe.schema"

export class RecipeService {
  /**
   * Create a new recipe
   */
  static async createRecipe(tenantId: string, data: CreateRecipeInput) {
    // Verify product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId },
    })

    if (!product) {
      throw new Error("Product not found")
    }

    // Verify all raw materials exist
    const rawMaterialIds = data.ingredients.map((i) => i.rawMaterialId)
    const rawMaterials = await prisma.product.findMany({
      where: {
        id: { in: rawMaterialIds },
        tenantId,
        isRawMaterial: true,
      },
    })

    if (rawMaterials.length !== rawMaterialIds.length) {
      throw new Error("Some raw materials not found or are not marked as raw materials")
    }

    return prisma.recipe.create({
      data: {
        tenantId,
        productId: data.productId,
        name: data.name,
        description: data.description,
        prepTime: data.prepTime,
        ingredients: {
          create: data.ingredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: ing.quantity,
            unit: ing.unit,
            wastagePercent: ing.wastagePercent || 0,
          })),
        },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        ingredients: {
          include: {
            // We need to manually fetch raw material info
          },
        },
      },
    })
  }

  /**
   * Get recipe by ID with cost calculation
   */
  static async getRecipeById(tenantId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        ingredients: true,
      },
    })

    if (!recipe) {
      throw new Error("Recipe not found")
    }

    // Fetch raw materials for cost calculation
    const rawMaterialIds = recipe.ingredients.map((i) => i.rawMaterialId)
    const rawMaterials = await prisma.product.findMany({
      where: { id: { in: rawMaterialIds }, tenantId },
      select: { id: true, name: true, sku: true, costPrice: true, unit: true, stock: true },
    })

    const rawMaterialMap = new Map(rawMaterials.map((rm) => [rm.id, rm]))

    // Calculate costs
    let totalCost = new Decimal(0)
    const ingredientsWithCost = recipe.ingredients.map((ing) => {
      const rawMaterial = rawMaterialMap.get(ing.rawMaterialId)
      const costPerUnit = rawMaterial?.costPrice
        ? new Decimal(rawMaterial.costPrice.toString())
        : new Decimal(0)

      // Apply wastage
      const wastageMultiplier = new Decimal(1).plus(new Decimal(ing.wastagePercent.toString()).div(100))
      const quantityWithWastage = new Decimal(ing.quantity.toString()).mul(wastageMultiplier)

      const ingredientCost = quantityWithWastage.mul(costPerUnit)
      totalCost = totalCost.plus(ingredientCost)

      return {
        ...ing,
        rawMaterial,
        costPerUnit: costPerUnit.toNumber(),
        ingredientCost: ingredientCost.toNumber(),
      }
    })

    const sellingPrice = recipe.product.price
      ? new Decimal(recipe.product.price.toString())
      : new Decimal(0)

    const foodCostPercent = sellingPrice.gt(0)
      ? totalCost.div(sellingPrice).mul(100).toFixed(2)
      : "0.00"

    return {
      ...recipe,
      ingredients: ingredientsWithCost,
      totalCost: totalCost.toNumber(),
      sellingPrice: sellingPrice.toNumber(),
      foodCostPercent: parseFloat(foodCostPercent),
      grossProfit: sellingPrice.minus(totalCost).toNumber(),
    }
  }

  /**
   * Get recipe by product ID
   */
  static async getRecipeByProductId(tenantId: string, productId: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { productId, tenantId },
    })

    if (!recipe) {
      return null
    }

    return this.getRecipeById(tenantId, recipe.id)
  }

  /**
   * List recipes with filtering
   */
  static async listRecipes(tenantId: string, query: RecipeQuery) {
    const { search, isActive, page = 1, pageSize = 20 } = query

    const where: Prisma.RecipeWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { product: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    }

    const [total, recipes] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true },
          },
          _count: { select: { ingredients: true } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      data: recipes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Update a recipe
   */
  static async updateRecipe(tenantId: string, id: string, data: UpdateRecipeInput) {
    const existing = await prisma.recipe.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Recipe not found")
    }

    // If updating ingredients, verify all raw materials
    if (data.ingredients) {
      const rawMaterialIds = data.ingredients.map((i) => i.rawMaterialId)
      const rawMaterials = await prisma.product.findMany({
        where: {
          id: { in: rawMaterialIds },
          tenantId,
          isRawMaterial: true,
        },
      })

      if (rawMaterials.length !== rawMaterialIds.length) {
        throw new Error("Some raw materials not found")
      }
    }

    return prisma.$transaction(async (tx) => {
      // Delete existing ingredients if new ones provided
      if (data.ingredients) {
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id },
        })
      }

      return tx.recipe.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.prepTime !== undefined && { prepTime: data.prepTime }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.ingredients && {
            ingredients: {
              create: data.ingredients.map((ing) => ({
                rawMaterialId: ing.rawMaterialId,
                quantity: ing.quantity,
                unit: ing.unit,
                wastagePercent: ing.wastagePercent || 0,
              })),
            },
          }),
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true },
          },
          ingredients: true,
        },
      })
    })
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(tenantId: string, id: string) {
    const existing = await prisma.recipe.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error("Recipe not found")
    }

    return prisma.recipe.delete({
      where: { id },
    })
  }

  /**
   * Get raw materials list
   */
  static async getRawMaterials(tenantId: string, search?: string) {
    return prisma.product.findMany({
      where: {
        tenantId,
        isRawMaterial: true,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        costPrice: true,
        unit: true,
        stock: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    })
  }

  /**
   * Deduct raw materials when a product with recipe is sold
   * This should be called after a sale is made
   */
  static async deductRawMaterials(
    tenantId: string,
    productId: string,
    quantitySold: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma

    const recipe = await client.recipe.findFirst({
      where: { productId, tenantId, isActive: true },
      include: { ingredients: true },
    })

    if (!recipe) {
      // No recipe for this product, nothing to deduct
      return null
    }

    // Deduct each ingredient
    const deductions = []
    for (const ingredient of recipe.ingredients) {
      // Calculate quantity to deduct (including wastage)
      const wastageMultiplier = new Decimal(1).plus(new Decimal(ingredient.wastagePercent.toString()).div(100))
      const quantityWithWastage = new Decimal(ingredient.quantity.toString())
        .mul(wastageMultiplier)
        .mul(quantitySold)
        .toNumber()

      // Deduct from raw material stock
      const result = await client.product.updateMany({
        where: {
          id: ingredient.rawMaterialId,
          tenantId,
        },
        data: {
          stock: { decrement: Math.ceil(quantityWithWastage) },
        },
      })

      deductions.push({
        rawMaterialId: ingredient.rawMaterialId,
        quantityDeducted: quantityWithWastage,
        success: result.count > 0,
      })
    }

    return {
      recipeId: recipe.id,
      productId,
      quantitySold,
      deductions,
    }
  }

  /**
   * Calculate food cost for a period
   */
  static async getFoodCostReport(tenantId: string, startDate: Date, endDate: Date) {
    // Get all recipes with their products
    const recipes = await prisma.recipe.findMany({
      where: { tenantId, isActive: true },
      include: {
        product: {
          select: { id: true, name: true, price: true },
        },
        ingredients: true,
      },
    })

    // Get raw materials for cost calculation
    const allRawMaterialIds = recipes.flatMap((r) =>
      r.ingredients.map((i) => i.rawMaterialId)
    )
    const rawMaterials = await prisma.product.findMany({
      where: { id: { in: allRawMaterialIds } },
      select: { id: true, costPrice: true },
    })
    const rawMaterialCostMap = new Map(
      rawMaterials.map((rm) => [rm.id, rm.costPrice?.toNumber() || 0])
    )

    // Get sales data for the period
    const salesData = await prisma.invoiceItem.groupBy({
      by: ["productId"],
      where: {
        invoice: {
          tenantId,
          type: "SALE",
          status: "COMPLETED",
          invoiceDate: { gte: startDate, lte: endDate },
        },
      },
      _sum: { quantity: true, lineTotal: true },
    })

    const salesMap = new Map(
      salesData.map((s) => [
        s.productId,
        { quantity: s._sum.quantity || 0, revenue: s._sum.lineTotal?.toNumber() || 0 },
      ])
    )

    // Calculate food cost for each recipe
    const reportItems = recipes.map((recipe) => {
      // Calculate recipe cost
      let recipeCost = new Decimal(0)
      for (const ing of recipe.ingredients) {
        const costPerUnit = new Decimal(rawMaterialCostMap.get(ing.rawMaterialId) || 0)
        const wastageMultiplier = new Decimal(1).plus(new Decimal(ing.wastagePercent.toString()).div(100))
        const quantityWithWastage = new Decimal(ing.quantity.toString()).mul(wastageMultiplier)
        recipeCost = recipeCost.plus(quantityWithWastage.mul(costPerUnit))
      }

      const sales = salesMap.get(recipe.productId)
      const quantitySold = sales?.quantity || 0
      const revenue = sales?.revenue || 0
      const totalCost = recipeCost.mul(quantitySold).toNumber()
      const grossProfit = revenue - totalCost
      const foodCostPercent = revenue > 0 ? (totalCost / revenue) * 100 : 0

      return {
        productId: recipe.productId,
        productName: recipe.product.name,
        recipeName: recipe.name,
        recipeCost: recipeCost.toNumber(),
        quantitySold,
        revenue,
        totalCost,
        grossProfit,
        foodCostPercent,
      }
    })

    // Calculate totals
    const totals = reportItems.reduce(
      (acc, item) => ({
        totalRevenue: acc.totalRevenue + item.revenue,
        totalCost: acc.totalCost + item.totalCost,
        totalProfit: acc.totalProfit + item.grossProfit,
      }),
      { totalRevenue: 0, totalCost: 0, totalProfit: 0 }
    )

    const overallFoodCostPercent =
      totals.totalRevenue > 0
        ? (totals.totalCost / totals.totalRevenue) * 100
        : 0

    return {
      items: reportItems,
      totals: {
        ...totals,
        foodCostPercent: overallFoodCostPercent,
      },
      period: { startDate, endDate },
    }
  }
}

export default RecipeService
