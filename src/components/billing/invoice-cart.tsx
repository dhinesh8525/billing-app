"use client"

/**
 * Invoice Cart Component
 *
 * Shopping cart for the billing interface with quantity controls and totals.
 */

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/utils"
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import { CartItem } from "@/types"

interface InvoiceCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  discountPercent: number
  taxRate: number
}

export function InvoiceCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  discountPercent,
  taxRate,
}: InvoiceCartProps) {
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discountAmount = (subtotal * discountPercent) / 100
  const afterDiscount = subtotal - discountAmount
  const taxAmount = (afterDiscount * taxRate) / 100
  const total = afterDiscount + taxAmount
  const roundedTotal = Math.round(total)
  const roundOff = roundedTotal - total

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <ShoppingCart className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-slate-900">Cart is empty</h3>
        <p className="mt-1 text-sm text-slate-500">
          Search and add products to start billing
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Items List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.productId}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(item.price)} x {item.quantity} {item.unit}
                  </p>
                  {item.taxRate > 0 && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      GST {item.taxRate}%
                    </Badge>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(item.lineTotal)}</p>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      onUpdateQuantity(item.productId, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(
                        item.productId,
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="h-7 w-14 text-center text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      onUpdateQuantity(item.productId, item.quantity + 1)
                    }
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onRemoveItem(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {index < items.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="border-t pt-4 mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {discountPercent > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Discount ({discountPercent}%)</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            GST ({taxRate}%)
            <span className="text-xs text-slate-400 ml-1">
              (CGST {taxRate / 2}% + SGST {taxRate / 2}%)
            </span>
          </span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>

        {roundOff !== 0 && (
          <div className="flex justify-between text-sm text-slate-500">
            <span>Round Off</span>
            <span>
              {roundOff > 0 ? "+" : ""}
              {formatCurrency(roundOff)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(roundedTotal)}
          </span>
        </div>

        <p className="text-xs text-slate-500 text-right">
          {items.length} items • {items.reduce((sum, i) => sum + i.quantity, 0)}{" "}
          units
        </p>
      </div>
    </div>
  )
}
