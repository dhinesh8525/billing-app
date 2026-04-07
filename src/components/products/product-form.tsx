"use client"

/**
 * Product Form
 *
 * Reusable form for creating and editing products.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { generateSKU } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface Category {
  id: string
  name: string
}

interface ProductFormProps {
  product?: {
    id: string
    name: string
    sku: string
    description: string | null
    price: number | { toNumber: () => number }
    costPrice: number | { toNumber: () => number } | null
    stock: number
    minStock: number
    unit: string
    hsn: string | null
    taxRate: number | { toNumber: () => number } | null
    categoryId: string | null
  }
}

const units = ["pcs", "kg", "g", "ltr", "ml", "box", "pack", "dz", "set"]

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!product

  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Form state
  const [name, setName] = useState(product?.name || "")
  const [sku, setSku] = useState(product?.sku || generateSKU())
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(
    product?.price
      ? typeof product.price === "number"
        ? product.price.toString()
        : product.price.toNumber().toString()
      : ""
  )
  const [costPrice, setCostPrice] = useState(
    product?.costPrice
      ? typeof product.costPrice === "number"
        ? product.costPrice.toString()
        : product.costPrice.toNumber().toString()
      : ""
  )
  const [stock, setStock] = useState(product?.stock?.toString() || "0")
  const [minStock, setMinStock] = useState(product?.minStock?.toString() || "5")
  const [unit, setUnit] = useState(product?.unit || "pcs")
  const [hsn, setHsn] = useState(product?.hsn || "")
  const [taxRate, setTaxRate] = useState(
    product?.taxRate
      ? typeof product.taxRate === "number"
        ? product.taxRate.toString()
        : product.taxRate.toNumber().toString()
      : "18"
  )
  const [categoryId, setCategoryId] = useState(product?.categoryId || "")

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        if (data.success) {
          setCategories(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      }
    }
    fetchCategories()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const payload = {
      name,
      sku,
      description: description || null,
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stock: parseInt(stock),
      minStock: parseInt(minStock),
      unit,
      hsn: hsn || null,
      taxRate: taxRate ? parseFloat(taxRate) : null,
      categoryId: categoryId || null,
    }

    try {
      const response = await fetch(
        isEditing ? `/api/products/${product.id}` : "/api/products",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save product")
      }

      toast.success(isEditing ? "Product updated" : "Product created")
      router.push("/products")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Product name, SKU, and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="Product SKU"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSku(generateSKU())}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description (optional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId || "none"} onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
            <CardDescription>Set selling price and GST details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice">Purchase Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hsn">HSN/SAC Code</Label>
                <Input
                  id="hsn"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g., 8471"
                  maxLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">GST Rate (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Stock quantity and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Current Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Low Stock Alert</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  )
}
