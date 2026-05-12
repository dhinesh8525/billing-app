"use client"

/**
 * Recipe Form Component
 *
 * Create/edit form for recipes with ingredient selector.
 * Shows cost calculation and food cost percentage.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"
import { Loader2, Plus, Trash2, Search, AlertCircle } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  price: number | { toNumber?: () => number }
}

interface RawMaterial {
  id: string
  name: string
  sku: string
  costPrice: number | { toNumber?: () => number } | null
  unit: string
  stock: number
}

interface Ingredient {
  rawMaterialId: string
  rawMaterialName?: string
  quantity: number
  unit: string
  wastagePercent: number
  costPerUnit?: number
}

interface RecipeFormProps {
  recipe?: {
    id: string
    productId: string
    name: string
    description: string | null
    prepTime: number | null
    ingredients: Array<{
      rawMaterialId: string
      quantity: number | { toNumber?: () => number }
      unit: string
      wastagePercent: number | { toNumber?: () => number }
      rawMaterial?: RawMaterial
    }>
  }
}

const units = ["g", "kg", "ml", "ltr", "pcs", "tsp", "tbsp", "cup", "oz", "lb"]

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter()
  const isEditing = !!recipe

  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [ingredientSearchOpen, setIngredientSearchOpen] = useState(false)

  // Form state
  const [productId, setProductId] = useState(recipe?.productId || "")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [name, setName] = useState(recipe?.name || "")
  const [description, setDescription] = useState(recipe?.description || "")
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || "")
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients.map((ing) => ({
      rawMaterialId: ing.rawMaterialId,
      rawMaterialName: ing.rawMaterial?.name,
      quantity: typeof ing.quantity === "object" && ing.quantity?.toNumber
        ? ing.quantity.toNumber()
        : Number(ing.quantity),
      unit: ing.unit,
      wastagePercent: typeof ing.wastagePercent === "object" && ing.wastagePercent?.toNumber
        ? ing.wastagePercent.toNumber()
        : Number(ing.wastagePercent),
      costPerUnit: ing.rawMaterial?.costPrice
        ? typeof ing.rawMaterial.costPrice === "object" && ing.rawMaterial.costPrice?.toNumber
          ? ing.rawMaterial.costPrice.toNumber()
          : Number(ing.rawMaterial.costPrice)
        : 0,
    })) || []
  )

  // Fetch products (non-raw materials)
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products/search?limit=100")
        const data = await response.json()
        if (data.success) {
          // Filter out raw materials
          const nonRawMaterials = data.data.filter((p: { isRawMaterial?: boolean }) => !p.isRawMaterial)
          setProducts(nonRawMaterials)

          // If editing, find the selected product
          if (recipe?.productId) {
            const product = nonRawMaterials.find((p: Product) => p.id === recipe.productId)
            if (product) setSelectedProduct(product)
          }
        }
      } catch (error) {
        console.error("Failed to fetch products:", error)
      }
    }
    fetchProducts()
  }, [recipe?.productId])

  // Fetch raw materials
  useEffect(() => {
    async function fetchRawMaterials() {
      try {
        const response = await fetch("/api/raw-materials")
        const data = await response.json()
        if (data.success) {
          setRawMaterials(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch raw materials:", error)
      }
    }
    fetchRawMaterials()
  }, [])

  // Calculate totals
  const calculateIngredientCost = (ing: Ingredient) => {
    const costPerUnit = ing.costPerUnit || 0
    const quantityWithWastage = ing.quantity * (1 + ing.wastagePercent / 100)
    return costPerUnit * quantityWithWastage
  }

  const totalCost = ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0)

  const sellingPrice = selectedProduct?.price
    ? typeof selectedProduct.price === "object" && selectedProduct.price?.toNumber
      ? selectedProduct.price.toNumber()
      : Number(selectedProduct.price)
    : 0

  const foodCostPercent = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0
  const grossProfit = sellingPrice - totalCost

  // Add ingredient
  const handleAddIngredient = (rawMaterial: RawMaterial) => {
    const costPrice = rawMaterial.costPrice
      ? typeof rawMaterial.costPrice === "object" && rawMaterial.costPrice?.toNumber
        ? rawMaterial.costPrice.toNumber()
        : Number(rawMaterial.costPrice)
      : 0

    setIngredients([
      ...ingredients,
      {
        rawMaterialId: rawMaterial.id,
        rawMaterialName: rawMaterial.name,
        quantity: 1,
        unit: rawMaterial.unit,
        wastagePercent: 0,
        costPerUnit: costPrice,
      },
    ])
    setIngredientSearchOpen(false)
  }

  // Remove ingredient
  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  // Update ingredient
  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: number | string) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productId) {
      toast.error("Please select a product")
      return
    }

    if (ingredients.length === 0) {
      toast.error("Please add at least one ingredient")
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        productId,
        name: name || selectedProduct?.name || "Recipe",
        description: description || null,
        prepTime: prepTime ? parseInt(prepTime) : null,
        ingredients: ingredients.map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          quantity: ing.quantity,
          unit: ing.unit,
          wastagePercent: ing.wastagePercent,
        })),
      }

      const response = await fetch(
        isEditing ? `/api/recipes/${recipe.id}` : "/api/recipes",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save recipe")
      }

      toast.success(isEditing ? "Recipe updated" : "Recipe created")
      router.push("/recipes")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save recipe")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Details</CardTitle>
              <CardDescription>
                Select a product and add ingredients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selector */}
              <div className="space-y-2">
                <Label>Product *</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger
                    className={cn(
                      "inline-flex items-center justify-between w-full rounded-md border border-input bg-background",
                      "px-3 py-2 text-sm ring-offset-background",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isEditing && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isEditing}
                  >
                    {selectedProduct ? selectedProduct.name : "Select a product..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No products found</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => {
                                setProductId(product.id)
                                setSelectedProduct(product)
                                if (!name) setName(product.name + " Recipe")
                                setProductSearchOpen(false)
                              }}
                            >
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-slate-500">
                                  {product.sku} • {formatCurrency(
                                    typeof product.price === "object" && product.price?.toNumber
                                      ? product.price.toNumber()
                                      : Number(product.price)
                                  )}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipe Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Recipe name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prep Time (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional recipe notes or instructions"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>Add raw materials used in this recipe</CardDescription>
              </div>
              <Popover open={ingredientSearchOpen} onOpenChange={setIngredientSearchOpen}>
                <PopoverTrigger
                  className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    "h-9 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ingredient
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search raw materials..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-4 text-center text-sm text-slate-500">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No raw materials found</p>
                          <p className="text-xs mt-1">
                            Mark products as &quot;Raw Material&quot; in Items page
                          </p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {rawMaterials.map((rm) => (
                          <CommandItem
                            key={rm.id}
                            onSelect={() => handleAddIngredient(rm)}
                          >
                            <div className="flex-1">
                              <p className="font-medium">{rm.name}</p>
                              <p className="text-xs text-slate-500">
                                {rm.sku} • {rm.unit} • Stock: {rm.stock}
                              </p>
                            </div>
                            <span className="text-xs text-slate-400">
                              {formatCurrency(
                                rm.costPrice
                                  ? typeof rm.costPrice === "object" && rm.costPrice?.toNumber
                                    ? rm.costPrice.toNumber()
                                    : Number(rm.costPrice)
                                  : 0
                              )}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              {ingredients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No ingredients added yet</p>
                  <p className="text-sm">Click &quot;Add Ingredient&quot; to start</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ingredients.map((ing, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ing.rawMaterialName}</p>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={ing.quantity}
                        onChange={(e) =>
                          handleUpdateIngredient(index, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-20"
                      />
                      <Select
                        value={ing.unit}
                        onValueChange={(v) => handleUpdateIngredient(index, "unit", v)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={ing.wastagePercent}
                          onChange={(e) =>
                            handleUpdateIngredient(index, "wastagePercent", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                        />
                        <p className="text-xs text-slate-400 mt-0.5">Wastage %</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="font-medium">
                          {formatCurrency(calculateIngredientCost(ing))}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cost Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Selling Price</span>
                <span className="font-medium">{formatCurrency(sellingPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Recipe Cost</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="text-slate-600">Gross Profit</span>
                <span className={cn(
                  "font-bold text-lg",
                  grossProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Food Cost %</span>
                <span className={cn(
                  "font-bold",
                  foodCostPercent <= 30 ? "text-green-600" :
                  foodCostPercent <= 40 ? "text-yellow-600" : "text-red-600"
                )}>
                  {foodCostPercent.toFixed(1)}%
                </span>
              </div>

              {/* Food Cost Guidelines */}
              <div className="pt-4 border-t text-xs text-slate-500">
                <p className="font-medium mb-2">Food Cost Guidelines:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    &lt;30% - Excellent
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    30-40% - Good
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    &gt;40% - Review pricing
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Recipe" : "Create Recipe"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default RecipeForm
