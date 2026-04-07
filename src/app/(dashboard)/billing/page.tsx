"use client"

/**
 * Billing (POS) Page
 *
 * Main point-of-sale interface for creating invoices.
 * Features product search, cart management, and invoice creation.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ProductSearch } from "@/components/billing/product-search"
import { InvoiceCart } from "@/components/billing/invoice-cart"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  FileText,
  Loader2,
  Check,
  Printer,
  User,
} from "lucide-react"
import { CartItem } from "@/types"

const paymentModes = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "credit", label: "Credit", icon: FileText },
]

export default function BillingPage() {
  const router = useRouter()

  // Cart state
  const [items, setItems] = useState<CartItem[]>([])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxRate] = useState(18) // Default GST rate

  // Customer state
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")

  // Payment state
  const [paymentMode, setPaymentMode] = useState("cash")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedInvoice, setCompletedInvoice] = useState<{
    invoiceNumber: string
    total: number
  } | null>(null)

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discountAmount = (subtotal * discountPercent) / 100
  const afterDiscount = subtotal - discountAmount
  const taxAmount = (afterDiscount * taxRate) / 100
  const total = afterDiscount + taxAmount
  const roundedTotal = Math.round(total)

  // Add product to cart
  const handleAddProduct = (product: {
    id: string
    name: string
    sku: string
    price: number | { toNumber?: () => number }
    stock: number
    unit: string
    taxRate: number | null
  }) => {
    const price =
      typeof product.price === "object" && product.price?.toNumber
        ? product.price.toNumber()
        : Number(product.price)

    const existingIndex = items.findIndex((i) => i.productId === product.id)

    if (existingIndex >= 0) {
      // Increment quantity
      const existing = items[existingIndex]
      if (existing.quantity < product.stock) {
        const newQuantity = existing.quantity + 1
        const newItems = [...items]
        newItems[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          lineTotal: price * newQuantity,
        }
        setItems(newItems)
        toast.success(`${product.name} quantity updated`)
      } else {
        toast.error("Maximum stock reached")
      }
    } else {
      // Add new item
      setItems([
        ...items,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price,
          quantity: 1,
          stock: product.stock,
          unit: product.unit,
          taxRate: product.taxRate || taxRate,
          discount: 0,
          lineTotal: price,
        },
      ])
      toast.success(`${product.name} added to cart`)
    }
  }

  // Update item quantity
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return

    const itemIndex = items.findIndex((i) => i.productId === productId)
    if (itemIndex < 0) return

    const item = items[itemIndex]
    if (quantity > item.stock) {
      toast.error(`Only ${item.stock} units available`)
      return
    }

    const newItems = [...items]
    newItems[itemIndex] = {
      ...item,
      quantity,
      lineTotal: item.price * quantity,
    }
    setItems(newItems)
  }

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId))
  }

  // Process payment
  const handlePayment = async () => {
    if (items.length === 0) {
      toast.error("Add items to cart first")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SALE",
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount,
          })),
          discountPercent,
          paymentMode,
          amountPaid: roundedTotal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invoice")
      }

      setCompletedInvoice({
        invoiceNumber: data.data.invoiceNumber,
        total: Number(data.data.total),
      })

      // Clear cart
      setItems([])
      setCustomerName("")
      setCustomerPhone("")
      setDiscountPercent(0)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice"
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // New sale
  const handleNewSale = () => {
    setCompletedInvoice(null)
    setShowPaymentDialog(false)
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6">
      {/* Left Side - Product Search & List */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Sale Invoice</CardTitle>
            <CardDescription>
              Search and add products to create an invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Product Search */}
            <ProductSearch onSelect={handleAddProduct} autoFocus />

            {/* Quick Info */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="text-2xl font-bold">{formatCurrency(subtotal)}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-sm text-primary">Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(roundedTotal)}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone (Optional)</Label>
                <Input
                  id="customerPhone"
                  placeholder="10-digit mobile number"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </div>
            </div>

            {/* Discount */}
            <div className="mt-6">
              <Label htmlFor="discount">Discount %</Label>
              <div className="flex gap-2 mt-2">
                {[0, 5, 10, 15, 20].map((d) => (
                  <Button
                    key={d}
                    variant={discountPercent === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDiscountPercent(d)}
                  >
                    {d}%
                  </Button>
                ))}
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  className="w-20"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(Math.min(100, parseInt(e.target.value) || 0))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Cart */}
      <Card className="w-96 flex flex-col">
        <CardHeader>
          <CardTitle>Cart</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <InvoiceCart
            items={items}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            discountPercent={discountPercent}
            taxRate={taxRate}
          />

          {items.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              {/* Payment Mode */}
              <Label className="mb-2 block">Payment Mode</Label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {paymentModes.slice(0, 3).map((mode) => (
                  <Button
                    key={mode.value}
                    variant={paymentMode === mode.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode(mode.value)}
                    className="flex flex-col h-16 gap-1"
                  >
                    <mode.icon className="h-4 w-4" />
                    <span className="text-xs">{mode.label}</span>
                  </Button>
                ))}
              </div>

              <Button
                className="w-full h-14 text-lg"
                onClick={() => setShowPaymentDialog(true)}
                disabled={items.length === 0}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pay {formatCurrency(roundedTotal)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          {completedInvoice ? (
            <>
              <DialogHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <DialogTitle className="text-center text-xl">
                  Payment Successful!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Invoice created successfully
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Invoice Number</p>
                  <p className="text-lg font-mono font-bold">
                    {completedInvoice.invoiceNumber}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-slate-500">Amount Paid</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(completedInvoice.total)}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/invoices?search=${completedInvoice.invoiceNumber}`
                    )
                  }
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Invoice
                </Button>
                <Button onClick={handleNewSale} className="flex-1">
                  New Sale
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  Review the invoice details before processing payment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{customerName}</span>
                    {customerPhone && (
                      <span className="text-slate-400">• {customerPhone}</span>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(roundedTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  {paymentModes.find((m) => m.value === paymentMode)?.icon && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {(() => {
                        const Icon = paymentModes.find(
                          (m) => m.value === paymentMode
                        )?.icon
                        return Icon ? (
                          <Icon className="h-4 w-4 text-primary" />
                        ) : null
                      })()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Payment Method</p>
                    <p className="text-xs text-slate-500">
                      {paymentModes.find((m) => m.value === paymentMode)?.label}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="min-w-32"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
