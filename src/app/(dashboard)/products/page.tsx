/**
 * Products List Page
 *
 * Displays all products with filtering, search, and CRUD operations.
 */

import { Suspense } from "react"
import Link from "next/link"
import { ProductService } from "@/services"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
} from "lucide-react"
import { ProductActions } from "@/components/products/product-actions"

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string
    categoryId?: string
    lowStock?: string
    page?: string
  }>
}

async function ProductsTable({ searchParams }: { searchParams: ProductsPageProps["searchParams"] }) {
  const params = await searchParams
  const result = await ProductService.list({
    q: params.q,
    categoryId: params.categoryId,
    lowStock: params.lowStock === "true",
    page: parseInt(params.page || "1"),
    pageSize: 20,
    sortBy: "name",
    sortOrder: "asc",
  })

  await ProductService.getCategories()

  if (result.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No products found</h3>
        <p className="text-slate-500 mt-1">
          {params.q
            ? `No products match "${params.q}"`
            : "Get started by adding your first product."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((product) => {
            const isLowStock = product.stock <= product.minStock
            const stockValue = product.stock * Number(product.price)

            return (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.hsn && (
                      <p className="text-xs text-slate-500">HSN: {product.hsn}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    {product.sku}
                  </code>
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="secondary">{product.category.name}</Badge>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(product.price))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isLowStock && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span
                      className={
                        isLowStock ? "text-amber-600 font-medium" : ""
                      }
                    >
                      {product.stock} {product.unit}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-slate-600">
                  {formatCurrency(stockValue)}
                </TableCell>
                <TableCell>
                  <ProductActions product={product} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <p className="text-sm text-slate-600">
            Showing {(result.pagination.page - 1) * result.pagination.pageSize + 1} to{" "}
            {Math.min(
              result.pagination.page * result.pagination.pageSize,
              result.pagination.total
            )}{" "}
            of {result.pagination.total} products
          </p>
          <div className="flex gap-2">
            {result.pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/products?page=${result.pagination.page - 1}${
                    params.q ? `&q=${params.q}` : ""
                  }`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {result.pagination.page < result.pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/products?page=${result.pagination.page + 1}${
                    params.q ? `&q=${params.q}` : ""
                  }`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ProductsTableSkeleton() {
  return (
    <div className="animate-pulse">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-5 w-32 bg-slate-200 rounded" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-20 bg-slate-200 rounded" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-24 bg-slate-200 rounded" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-16 bg-slate-200 rounded ml-auto" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-12 bg-slate-200 rounded ml-auto" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-16 bg-slate-200 rounded ml-auto" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-8 bg-slate-200 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Items</h1>
          <p className="text-slate-500">Manage your products and inventory</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <form className="flex-1 relative" action="/products">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                name="q"
                placeholder="Search by name or SKU..."
                className="pl-10"
                defaultValue={params.q}
              />
            </form>
            <div className="flex gap-2">
              <Button
                variant={params.lowStock === "true" ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={
                    params.lowStock === "true"
                      ? "/products"
                      : "/products?lowStock=true"
                  }
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Low Stock
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<ProductsTableSkeleton />}>
            <ProductsTable searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
