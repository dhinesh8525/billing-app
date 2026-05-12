"use client"

/**
 * Recipes Page
 *
 * List and manage recipes with cost display.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  UtensilsCrossed,
  ChefHat,
} from "lucide-react"

interface Recipe {
  id: string
  name: string
  productId: string
  isActive: boolean
  product: {
    id: string
    name: string
    sku: string
    price: number | { toNumber?: () => number }
  }
  _count: { ingredients: number }
}

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch recipes
  useEffect(() => {
    async function fetchRecipes() {
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)

        const response = await fetch(`/api/recipes?${params}`)
        const data = await response.json()

        if (data.success) {
          setRecipes(data.data.data)
        }
      } catch (error) {
        console.error("Failed to fetch recipes:", error)
        toast.error("Failed to load recipes")
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchRecipes, 300)
    return () => clearTimeout(debounce)
  }, [search])

  // Delete recipe
  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRecipes(recipes.filter((r) => r.id !== deleteId))
        toast.success("Recipe deleted")
      } else {
        throw new Error("Failed to delete")
      }
    } catch {
      toast.error("Failed to delete recipe")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const getPrice = (price: Recipe["product"]["price"]) => {
    if (typeof price === "object" && price?.toNumber) {
      return price.toNumber()
    }
    return Number(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-slate-500">Manage recipes and food cost</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/reports/food-cost")}>
            Food Cost Report
          </Button>
          <Button onClick={() => router.push("/recipes/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Recipe
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search recipes or products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Recipes</CardTitle>
          <CardDescription>
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No recipes yet</h3>
              <p className="text-slate-500 mt-1">
                Create your first recipe to track food costs
              </p>
              <Button className="mt-4" onClick={() => router.push("/recipes/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Recipe
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Ingredients</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <UtensilsCrossed className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{recipe.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{recipe.product.name}</p>
                        <p className="text-xs text-slate-500">{recipe.product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {recipe._count.ingredients} items
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getPrice(recipe.product.price))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipe.isActive ? "default" : "secondary"}>
                        {recipe.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(recipe.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recipe? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
