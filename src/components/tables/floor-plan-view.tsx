"use client"

/**
 * Floor Plan View Component
 *
 * Visual grid display of restaurant tables with status indicators.
 * Supports clicking tables to view/create orders.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TableCard } from "./table-card"
import { Loader2, RefreshCw, Plus, Settings } from "lucide-react"
import { toast } from "sonner"

interface FloorPlan {
  id: string
  name: string
  _count: { tables: number }
}

interface Table {
  id: string
  tableNumber: string
  capacity: number
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLING" | "CLEANING"
  shape: "square" | "round" | "rectangle"
  x: number
  y: number
  orders?: Array<{
    id: string
    orderNumber: string
    guestCount: number
    createdAt: string
    _count: { items: number }
  }>
}

interface TableStatusSummary {
  available: number
  occupied: number
  reserved: number
  billing: number
  cleaning: number
  total: number
}

interface FloorPlanViewProps {
  onTableSelect?: (table: Table) => void
  showEditorLink?: boolean
}

export function FloorPlanView({ onTableSelect, showEditorLink = true }: FloorPlanViewProps) {
  const router = useRouter()
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string>("")
  const [tables, setTables] = useState<Table[]>([])
  const [summary, setSummary] = useState<TableStatusSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch floor plans
  useEffect(() => {
    async function fetchFloorPlans() {
      try {
        const response = await fetch("/api/floor-plans")
        const data = await response.json()
        if (data.success) {
          setFloorPlans(data.data)
          if (data.data.length > 0 && !selectedFloorPlan) {
            setSelectedFloorPlan(data.data[0].id)
          }
        }
      } catch (error) {
        console.error("Failed to fetch floor plans:", error)
        toast.error("Failed to load floor plans")
      }
    }
    fetchFloorPlans()
  }, [])

  // Fetch tables and summary when floor plan changes
  useEffect(() => {
    if (!selectedFloorPlan) {
      setIsLoading(false)
      return
    }

    async function fetchData() {
      setIsLoading(true)
      try {
        const [tablesRes, summaryRes] = await Promise.all([
          fetch(`/api/tables?floorPlanId=${selectedFloorPlan}`),
          fetch(`/api/tables/summary?floorPlanId=${selectedFloorPlan}`),
        ])

        const tablesData = await tablesRes.json()
        const summaryData = await summaryRes.json()

        if (tablesData.success) {
          setTables(tablesData.data.data)
        }
        if (summaryData.success) {
          setSummary(summaryData.data)
        }
      } catch (error) {
        console.error("Failed to fetch tables:", error)
        toast.error("Failed to load tables")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedFloorPlan])

  // Refresh data
  const handleRefresh = async () => {
    if (!selectedFloorPlan) return

    setIsRefreshing(true)
    try {
      const [tablesRes, summaryRes] = await Promise.all([
        fetch(`/api/tables?floorPlanId=${selectedFloorPlan}`),
        fetch(`/api/tables/summary?floorPlanId=${selectedFloorPlan}`),
      ])

      const tablesData = await tablesRes.json()
      const summaryData = await summaryRes.json()

      if (tablesData.success) {
        setTables(tablesData.data.data)
      }
      if (summaryData.success) {
        setSummary(summaryData.data)
      }
    } catch (error) {
      console.error("Failed to refresh:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000)
    return () => clearInterval(interval)
  }, [selectedFloorPlan])

  const handleTableClick = (table: Table) => {
    if (onTableSelect) {
      onTableSelect(table)
    } else {
      // Default: navigate to billing page with table
      router.push(`/billing?tableId=${table.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (floorPlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">No floor plans found</p>
          {showEditorLink && (
            <Button onClick={() => router.push("/tables/editor")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Floor Plan
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedFloorPlan} onValueChange={setSelectedFloorPlan}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select floor plan" />
            </SelectTrigger>
            <SelectContent>
              {floorPlans.map((fp) => (
                <SelectItem key={fp.id} value={fp.id}>
                  {fp.name} ({fp._count.tables} tables)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {showEditorLink && (
          <Button variant="outline" onClick={() => router.push("/tables/editor")}>
            <Settings className="mr-2 h-4 w-4" />
            Edit Layout
          </Button>
        )}
      </div>

      {/* Status Summary */}
      {summary && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-green-50 border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            Available: {summary.available}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            Occupied: {summary.occupied}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
            Reserved: {summary.reserved}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
            Billing: {summary.billing}
          </Badge>
          <Badge variant="outline" className="bg-gray-50 border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-500 mr-1.5" />
            Cleaning: {summary.cleaning}
          </Badge>
        </div>
      )}

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">No tables in this floor plan</p>
            {showEditorLink && (
              <Button
                variant="outline"
                onClick={() => router.push("/tables/editor")}
              >
                Add Tables
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              id={table.id}
              tableNumber={table.tableNumber}
              capacity={table.capacity}
              status={table.status}
              shape={table.shape}
              currentOrder={
                table.orders?.[0]
                  ? {
                      id: table.orders[0].id,
                      orderNumber: table.orders[0].orderNumber,
                      guestCount: table.orders[0].guestCount,
                      createdAt: table.orders[0].createdAt,
                      itemCount: table.orders[0]._count?.items || 0,
                    }
                  : null
              }
              onClick={() => handleTableClick(table)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FloorPlanView
