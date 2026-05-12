"use client"

/**
 * Order Ticket Component (KOT Card)
 *
 * Displays a single order ticket in the KDS with item toggles.
 * Shows elapsed time, table info, and item status.
 */

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Clock, Users, CheckCircle, ChefHat, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface OrderItem {
  id: string
  productName: string
  quantity: number
  notes: string | null
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  station: string | null
}

interface OrderTicketProps {
  id: string
  orderNumber: string
  tableNumber?: string | null
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  guestCount: number
  createdAt: string
  elapsedMinutes: number
  items: OrderItem[]
  onItemStatusChange?: (orderId: string, itemId: string, status: string) => Promise<void>
  onOrderReady?: (orderId: string) => Promise<void>
}

export function OrderTicket({
  id,
  orderNumber,
  tableNumber,
  orderType,
  guestCount,
  elapsedMinutes,
  items,
  onItemStatusChange,
  onOrderReady,
}: OrderTicketProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isMarkingReady, setIsMarkingReady] = useState(false)

  // Determine urgency based on elapsed time
  const getUrgencyColor = () => {
    if (elapsedMinutes >= 20) return "border-red-500 bg-red-50"
    if (elapsedMinutes >= 10) return "border-yellow-500 bg-yellow-50"
    return "border-slate-200"
  }

  const getUrgencyBadge = () => {
    if (elapsedMinutes >= 20) return { color: "bg-red-500", label: "URGENT" }
    if (elapsedMinutes >= 10) return { color: "bg-yellow-500", label: "DELAYED" }
    return null
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  const handleItemToggle = async (itemId: string, currentStatus: string) => {
    if (!onItemStatusChange) return

    setIsUpdating(itemId)
    try {
      const newStatus = currentStatus === "PENDING" ? "PREPARING" :
                       currentStatus === "PREPARING" ? "READY" : currentStatus
      await onItemStatusChange(id, itemId, newStatus)
    } catch {
      toast.error("Failed to update item status")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleMarkReady = async () => {
    if (!onOrderReady) return

    setIsMarkingReady(true)
    try {
      await onOrderReady(id)
      toast.success("Order marked as ready")
    } catch {
      toast.error("Failed to mark order ready")
    } finally {
      setIsMarkingReady(false)
    }
  }

  const allItemsReady = items.every(
    (item) => item.status === "READY" || item.status === "SERVED" || item.status === "CANCELLED"
  )

  const urgencyBadge = getUrgencyBadge()

  return (
    <Card className={cn("border-2 transition-colors", getUrgencyColor())}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg">{orderNumber}</span>
              {urgencyBadge && (
                <Badge className={cn("text-white text-xs", urgencyBadge.color)}>
                  {urgencyBadge.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              {tableNumber && (
                <span className="font-medium">Table {tableNumber}</span>
              )}
              {orderType !== "DINE_IN" && (
                <Badge variant="outline" className="text-xs">
                  {orderType === "TAKEAWAY" ? "Takeaway" : "Delivery"}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-slate-600">
              <Clock className="h-4 w-4" />
              <span className={cn(
                "font-mono text-lg font-bold",
                elapsedMinutes >= 20 && "text-red-600",
                elapsedMinutes >= 10 && elapsedMinutes < 20 && "text-yellow-600"
              )}>
                {formatTime(elapsedMinutes)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <Users className="h-3 w-3" />
              <span>{guestCount}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Items List */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-colors",
                item.status === "READY" && "bg-green-50",
                item.status === "PREPARING" && "bg-blue-50",
                item.status === "CANCELLED" && "bg-slate-50 opacity-50"
              )}
            >
              <Checkbox
                checked={item.status === "READY" || item.status === "SERVED"}
                disabled={
                  isUpdating === item.id ||
                  item.status === "CANCELLED" ||
                  item.status === "SERVED"
                }
                onCheckedChange={() => handleItemToggle(item.id, item.status)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg">{item.quantity}x</span>
                  <span className={cn(
                    "font-medium",
                    item.status === "READY" && "line-through text-green-700",
                    item.status === "CANCELLED" && "line-through"
                  )}>
                    {item.productName}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-500" />
                    {item.notes}
                  </p>
                )}
                {item.station && item.station !== "KITCHEN" && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {item.station}
                  </Badge>
                )}
              </div>
              {item.status === "READY" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {item.status === "PREPARING" && (
                <ChefHat className="h-5 w-5 text-blue-600 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t">
          <Button
            className="w-full"
            variant={allItemsReady ? "default" : "outline"}
            onClick={handleMarkReady}
            disabled={isMarkingReady || allItemsReady}
          >
            {allItemsReady ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Ready
              </>
            ) : (
              <>
                <ChefHat className="mr-2 h-4 w-4" />
                Mark All Ready
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default OrderTicket
