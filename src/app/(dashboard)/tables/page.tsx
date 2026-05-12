"use client"

/**
 * Tables Management Page
 *
 * Visual table status view with floor plan selector.
 * Allows clicking tables to view orders or start new ones.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FloorPlanView } from "@/components/tables/floor-plan-view"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
  UtensilsCrossed,
  Clock,
  Users,
  FileText,
  Plus,
  CheckCircle,
  Loader2,
} from "lucide-react"

interface Table {
  id: string
  tableNumber: string
  capacity: number
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLING" | "CLEANING"
  shape: "square" | "round" | "rectangle"
  orders?: Array<{
    id: string
    orderNumber: string
    guestCount: number
    createdAt: string
    _count: { items: number }
  }>
}

interface OrderDetails {
  id: string
  orderNumber: string
  status: string
  guestCount: number
  createdAt: string
  items: Array<{
    id: string
    productName: string
    quantity: number
    unitPrice: number | { toNumber?: () => number }
    status: string
  }>
}

export default function TablesPage() {
  const router = useRouter()
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)

  const handleTableSelect = async (table: Table) => {
    setSelectedTable(table)
    setShowTableDialog(true)

    // If table is occupied, fetch order details
    if (table.status === "OCCUPIED" && table.orders?.[0]) {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/orders/${table.orders[0].id}`)
        const data = await response.json()
        if (data.success) {
          setOrderDetails(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch order:", error)
      } finally {
        setIsLoading(false)
      }
    } else {
      setOrderDetails(null)
    }
  }

  const handleNewOrder = () => {
    if (selectedTable) {
      router.push(`/billing?tableId=${selectedTable.id}`)
    }
  }

  const handleViewOrder = () => {
    if (orderDetails) {
      router.push(`/billing?tableId=${selectedTable?.id}&orderId=${orderDetails.id}`)
    }
  }

  const handleConvertToInvoice = () => {
    if (orderDetails && selectedTable) {
      router.push(`/billing?tableId=${selectedTable.id}&orderId=${orderDetails.id}&checkout=true`)
    }
  }

  const handleMarkAvailable = async () => {
    if (!selectedTable) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tables/${selectedTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "AVAILABLE" }),
      })

      if (response.ok) {
        toast.success("Table marked as available")
        setShowTableDialog(false)
        // Trigger refresh via page reload for simplicity
        window.location.reload()
      } else {
        throw new Error("Failed to update table")
      }
    } catch {
      toast.error("Failed to update table status")
    } finally {
      setIsLoading(false)
    }
  }

  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins} minutes`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  const calculateOrderTotal = (items: OrderDetails["items"]) => {
    return items.reduce((sum, item) => {
      const price = typeof item.unitPrice === "object" && item.unitPrice?.toNumber
        ? item.unitPrice.toNumber()
        : Number(item.unitPrice)
      return sum + price * item.quantity
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tables</h1>
          <p className="text-slate-500">Manage table occupancy and orders</p>
        </div>
        <Button onClick={() => router.push("/tables/editor")}>
          Manage Floor Plan
        </Button>
      </div>

      <FloorPlanView onTableSelect={handleTableSelect} />

      {/* Table Details Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Table {selectedTable?.tableNumber}
              <Badge
                variant={
                  selectedTable?.status === "AVAILABLE"
                    ? "default"
                    : selectedTable?.status === "OCCUPIED"
                    ? "secondary"
                    : "outline"
                }
              >
                {selectedTable?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Capacity: {selectedTable?.capacity} guests
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedTable?.status === "AVAILABLE" ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-slate-600">This table is available</p>
              </div>
            ) : selectedTable?.status === "CLEANING" ? (
              <div className="text-center py-4">
                <p className="text-slate-600">Table is being cleaned</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleMarkAvailable}
                  disabled={isLoading}
                >
                  Mark as Available
                </Button>
              </div>
            ) : orderDetails ? (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm text-slate-500">
                      {orderDetails.orderNumber}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">
                        {getElapsedTime(orderDetails.createdAt)}
                      </span>
                      <Users className="h-4 w-4 text-slate-400 ml-2" />
                      <span className="text-sm">{orderDetails.guestCount}</span>
                    </div>
                  </div>
                  <Badge>{orderDetails.status}</Badge>
                </div>

                {/* Order Items */}
                <div className="border rounded-lg">
                  <div className="p-3 border-b bg-slate-50 font-medium text-sm flex justify-between">
                    <span>Items</span>
                    <span>{orderDetails.items.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {orderDetails.items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-b last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === "SERVED"
                              ? "default"
                              : item.status === "READY"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                    {orderDetails.items.length > 5 && (
                      <div className="p-3 text-center text-sm text-slate-500">
                        +{orderDetails.items.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">Subtotal</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(calculateOrderTotal(orderDetails.items))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">No order details available</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedTable?.status === "AVAILABLE" ? (
              <Button className="w-full" onClick={handleNewOrder}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            ) : selectedTable?.status === "OCCUPIED" && orderDetails ? (
              <>
                <Button variant="outline" onClick={handleViewOrder}>
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  Add Items
                </Button>
                <Button onClick={handleConvertToInvoice}>
                  <FileText className="mr-2 h-4 w-4" />
                  Checkout
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowTableDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
