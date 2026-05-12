"use client"

/**
 * KDS Display Component
 *
 * Full kitchen display system with order grid and status filters.
 * Auto-refreshes every 5 seconds and plays sound alerts.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { OrderTicket } from "./order-ticket"
import { toast } from "sonner"
import {
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize,
  ChefHat,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderItem {
  id: string
  productName: string
  quantity: number
  notes: string | null
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  station: string | null
}

interface Order {
  id: string
  orderNumber: string
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  guestCount: number
  createdAt: string
  elapsedMinutes: number
  table: { id: string; tableNumber: string } | null
  items: OrderItem[]
}

interface OrderCounts {
  pending: number
  preparing: number
  ready: number
  total: number
}

export function KDSDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<OrderCounts>({ pending: 0, preparing: 0, ready: 0, total: 0 })
  const [station, setStation] = useState("ALL")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevOrderCountRef = useRef<number>(0)

  // Fetch orders
  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true)
    try {
      const response = await fetch(`/api/kds/pending-orders?station=${station}`)
      const data = await response.json()

      if (data.success) {
        const newOrders = data.data.orders
        setCounts(data.data.counts)

        // Play sound if new orders arrived
        if (
          soundEnabled &&
          audioRef.current &&
          newOrders.length > prevOrderCountRef.current
        ) {
          audioRef.current.play().catch(() => {
            // Ignore audio play errors (user interaction required)
          })
        }
        prevOrderCountRef.current = newOrders.length

        setOrders(newOrders)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [station, soundEnabled])

  // Initial fetch
  useEffect(() => {
    fetchOrders(true)
  }, [fetchOrders])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchOrders(false)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchOrders])

  // Handle item status change
  const handleItemStatusChange = async (orderId: string, itemId: string, status: string) => {
    try {
      const response = await fetch(`/api/kds/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        // Refresh orders
        fetchOrders(false)
      } else {
        throw new Error("Failed to update item")
      }
    } catch {
      toast.error("Failed to update item status")
      throw new Error("Failed to update")
    }
  }

  // Handle order ready
  const handleOrderReady = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/ready`, {
        method: "POST",
      })

      if (response.ok) {
        // Refresh orders
        fetchOrders(false)
      } else {
        throw new Error("Failed to mark ready")
      }
    } catch {
      toast.error("Failed to mark order ready")
      throw new Error("Failed to update")
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className={cn(
      "min-h-screen bg-slate-100",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Audio element for alerts */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/order-alert.mp3" type="audio/mpeg" />
        <source src="/sounds/order-alert.ogg" type="audio/ogg" />
      </audio>

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left side - Title and counts */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Kitchen Display</h1>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                  Pending: {counts.pending}
                </Badge>
                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                  Preparing: {counts.preparing}
                </Badge>
                <Badge variant="outline" className="bg-green-50 border-green-200">
                  Ready: {counts.ready}
                </Badge>
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-4">
              {/* Station Filter */}
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stations</SelectItem>
                  <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  <SelectItem value="BAR">Bar</SelectItem>
                  <SelectItem value="GRILL">Grill</SelectItem>
                  <SelectItem value="DESSERT">Dessert</SelectItem>
                </SelectContent>
              </Select>

              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5 text-slate-400" />
                )}
              </Button>

              {/* Auto-refresh Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">Auto</Label>
              </div>

              {/* Manual Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchOrders(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-600">No pending orders</h2>
            <p className="text-slate-400 mt-2">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <OrderTicket
                key={order.id}
                id={order.id}
                orderNumber={order.orderNumber}
                tableNumber={order.table?.tableNumber}
                orderType={order.orderType}
                guestCount={order.guestCount}
                createdAt={order.createdAt}
                elapsedMinutes={order.elapsedMinutes}
                items={order.items}
                onItemStatusChange={handleItemStatusChange}
                onOrderReady={handleOrderReady}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default KDSDisplay
