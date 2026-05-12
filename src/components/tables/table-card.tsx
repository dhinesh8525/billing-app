"use client"

/**
 * Table Card Component
 *
 * Displays a single table with its status and current order info.
 * Used in floor plan view and table list.
 */

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, UtensilsCrossed } from "lucide-react"

interface TableCardProps {
  id: string
  tableNumber: string
  capacity: number
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLING" | "CLEANING"
  shape?: "square" | "round" | "rectangle"
  currentOrder?: {
    id: string
    orderNumber: string
    guestCount: number
    createdAt: string | Date
    itemCount: number
  } | null
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

const statusConfig = {
  AVAILABLE: {
    color: "bg-green-100 border-green-300 hover:bg-green-200",
    badge: "bg-green-500",
    label: "Available",
  },
  OCCUPIED: {
    color: "bg-blue-100 border-blue-300 hover:bg-blue-200",
    badge: "bg-blue-500",
    label: "Occupied",
  },
  RESERVED: {
    color: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
    badge: "bg-yellow-500",
    label: "Reserved",
  },
  BILLING: {
    color: "bg-purple-100 border-purple-300 hover:bg-purple-200",
    badge: "bg-purple-500",
    label: "Billing",
  },
  CLEANING: {
    color: "bg-gray-100 border-gray-300 hover:bg-gray-200",
    badge: "bg-gray-500",
    label: "Cleaning",
  },
}

export function TableCard({
  tableNumber,
  capacity,
  status,
  shape = "square",
  currentOrder,
  onClick,
  selected,
  compact = false,
}: TableCardProps) {
  const config = statusConfig[status]

  // Calculate time since order started
  const getElapsedTime = (createdAt: string | Date) => {
    const start = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "relative p-3 border-2 transition-all cursor-pointer",
          config.color,
          shape === "round" ? "rounded-full" : "rounded-lg",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <span className="font-bold text-lg">{tableNumber}</span>
        <div className="absolute -top-1 -right-1">
          <span className={cn("w-3 h-3 rounded-full inline-block", config.badge)} />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-4 border-2 transition-all cursor-pointer min-w-[120px]",
        config.color,
        shape === "round" ? "rounded-full aspect-square" : "rounded-lg",
        shape === "rectangle" && "min-w-[160px]",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Table Number */}
      <div className="text-center">
        <span className="font-bold text-2xl">{tableNumber}</span>
      </div>

      {/* Status Badge */}
      <Badge
        variant="secondary"
        className={cn("mt-2 text-white text-xs", config.badge)}
      >
        {config.label}
      </Badge>

      {/* Capacity */}
      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-600">
        <Users className="h-3 w-3" />
        <span>{capacity}</span>
      </div>

      {/* Current Order Info */}
      {currentOrder && status === "OCCUPIED" && (
        <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{getElapsedTime(currentOrder.createdAt)}</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <UtensilsCrossed className="h-3 w-3" />
            <span>{currentOrder.itemCount} items</span>
          </div>
        </div>
      )}
    </button>
  )
}

export default TableCard
