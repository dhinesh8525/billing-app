"use client"

/**
 * Product Search Component
 *
 * Autocomplete search for products in the billing interface.
 */

import { useState, useEffect, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Package, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  sku: string
  price: number | { toNumber?: () => number }
  stock: number
  unit: string
  taxRate: number | null
}

interface ProductSearchProps {
  onSelect: (product: Product) => void
  autoFocus?: boolean
}

export function ProductSearch({ onSelect, autoFocus }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const searchProducts = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      )
      const data = await response.json()

      if (data.success) {
        // Convert price to number
        const products = data.data.map((p: Product) => ({
          ...p,
          price: typeof p.price === "object" && p.price?.toNumber
            ? p.price.toNumber()
            : Number(p.price),
        }))
        setResults(products)
        setIsOpen(products.length > 0)
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, 200)

  useEffect(() => {
    searchProducts(query)
  }, [query, searchProducts])

  const handleSelect = (product: Product) => {
    onSelect(product)
    setQuery("")
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
        break
      case "Enter":
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search products by name or SKU... (F2)"
          className="pl-10 h-12 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          autoFocus={autoFocus}
          data-search-input="true"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg"
        >
          <ul className="max-h-80 overflow-auto py-2">
            {results.map((product, index) => {
              const isLowStock = product.stock <= 5
              const isOutOfStock = product.stock === 0

              return (
                <li
                  key={product.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer",
                    index === selectedIndex && "bg-slate-100",
                    isOutOfStock && "opacity-50"
                  )}
                  onClick={() => !isOutOfStock && handleSelect(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Package className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        <code className="text-xs bg-slate-100 px-1 rounded">
                          {product.sku}
                        </code>
                        <span className="mx-2">•</span>
                        {product.stock} {product.unit} in stock
                        {product.taxRate && (
                          <>
                            <span className="mx-2">•</span>
                            GST {product.taxRate}%
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLowStock && !isOutOfStock && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    {isOutOfStock ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : (
                      <span className="text-lg font-semibold text-primary">
                        {formatCurrency(product.price as number)}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t px-4 py-2 text-xs text-slate-500">
            Press ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length > 0 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white p-4 text-center shadow-lg">
          <Package className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            No products found for &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
