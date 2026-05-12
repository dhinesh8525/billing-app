"use client"

/**
 * Floor Plan Editor Component
 *
 * Drag-drop editor for creating and managing floor plan layouts.
 * Allows positioning tables visually on a grid.
 */

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Save, Trash2, Loader2, Move } from "lucide-react"
import { cn } from "@/lib/utils"

interface FloorPlan {
  id: string
  name: string
  layout: { width: number; height: number; gridSize: number }
  tables: Table[]
}

interface Table {
  id: string
  tableNumber: string
  capacity: number
  x: number
  y: number
  shape: "square" | "round" | "rectangle"
  status: string
  isNew?: boolean
}

interface FloorPlanEditorProps {
  floorPlanId?: string
}

export function FloorPlanEditor({ floorPlanId }: FloorPlanEditorProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(!!floorPlanId)
  const [isSaving, setIsSaving] = useState(false)

  // New floor plan dialog
  const [showNewFloorPlanDialog, setShowNewFloorPlanDialog] = useState(!floorPlanId)
  const [newFloorPlanName, setNewFloorPlanName] = useState("")

  // New table dialog
  const [showNewTableDialog, setShowNewTableDialog] = useState(false)
  const [newTable, setNewTable] = useState({
    tableNumber: "",
    capacity: 4,
    shape: "square" as "square" | "round" | "rectangle",
  })

  const gridSize = floorPlan?.layout?.gridSize || 20
  const canvasWidth = floorPlan?.layout?.width || 800
  const canvasHeight = floorPlan?.layout?.height || 600

  // Load floor plan if editing
  useEffect(() => {
    if (!floorPlanId) return

    async function loadFloorPlan() {
      try {
        const response = await fetch(`/api/floor-plans/${floorPlanId}`)
        const data = await response.json()

        if (data.success) {
          setFloorPlan(data.data)
          setTables(data.data.tables || [])
        } else {
          toast.error("Failed to load floor plan")
        }
      } catch (error) {
        console.error("Failed to load floor plan:", error)
        toast.error("Failed to load floor plan")
      } finally {
        setIsLoading(false)
      }
    }

    loadFloorPlan()
  }, [floorPlanId])

  // Create new floor plan
  const handleCreateFloorPlan = async () => {
    if (!newFloorPlanName.trim()) {
      toast.error("Please enter a floor plan name")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/floor-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFloorPlanName,
          layout: { width: 800, height: 600, gridSize: 20 },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setFloorPlan(data.data)
        setShowNewFloorPlanDialog(false)
        toast.success("Floor plan created")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create floor plan")
    } finally {
      setIsSaving(false)
    }
  }

  // Add new table
  const handleAddTable = async () => {
    if (!newTable.tableNumber.trim()) {
      toast.error("Please enter a table number")
      return
    }

    if (!floorPlan) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorPlanId: floorPlan.id,
          tableNumber: newTable.tableNumber,
          capacity: newTable.capacity,
          shape: newTable.shape,
          x: 100,
          y: 100,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTables([...tables, data.data])
        setShowNewTableDialog(false)
        setNewTable({ tableNumber: "", capacity: 4, shape: "square" })
        toast.success("Table added")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add table")
    } finally {
      setIsSaving(false)
    }
  }

  // Delete table
  const handleDeleteTable = async (tableId: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTables(tables.filter((t) => t.id !== tableId))
        setSelectedTable(null)
        toast.success("Table deleted")
      } else {
        throw new Error("Failed to delete table")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete table")
    }
  }

  // Save table positions
  const handleSavePositions = async () => {
    setIsSaving(true)
    try {
      const updates = tables.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
      }))

      const response = await fetch("/api/tables/positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      if (response.ok) {
        toast.success("Positions saved")
      } else {
        throw new Error("Failed to save positions")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save positions")
    } finally {
      setIsSaving(false)
    }
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault()
    const table = tables.find((t) => t.id === tableId)
    if (!table || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left - table.x,
      y: e.clientY - rect.top - table.y,
    })
    setSelectedTable(tableId)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedTable || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    let newX = e.clientX - rect.left - dragOffset.x
    let newY = e.clientY - rect.top - dragOffset.y

    // Snap to grid
    newX = Math.round(newX / gridSize) * gridSize
    newY = Math.round(newY / gridSize) * gridSize

    // Keep within bounds
    newX = Math.max(0, Math.min(canvasWidth - 80, newX))
    newY = Math.max(0, Math.min(canvasHeight - 80, newY))

    setTables(
      tables.map((t) =>
        t.id === selectedTable ? { ...t, x: newX, y: newY } : t
      )
    )
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      {/* New Floor Plan Dialog */}
      <Dialog open={showNewFloorPlanDialog} onOpenChange={setShowNewFloorPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Floor Plan</DialogTitle>
            <DialogDescription>
              Create a new floor plan to arrange your tables
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Floor Plan Name</Label>
              <Input
                placeholder="e.g., Main Floor, Patio, Private Room"
                value={newFloorPlanName}
                onChange={(e) => setNewFloorPlanName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleCreateFloorPlan} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Table Dialog */}
      <Dialog open={showNewTableDialog} onOpenChange={setShowNewTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
            <DialogDescription>Add a new table to the floor plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Table Number</Label>
              <Input
                placeholder="e.g., T1, A1, 101"
                value={newTable.tableNumber}
                onChange={(e) =>
                  setNewTable({ ...newTable, tableNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={newTable.capacity}
                onChange={(e) =>
                  setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Shape</Label>
              <Select
                value={newTable.shape}
                onValueChange={(v) =>
                  setNewTable({ ...newTable, shape: v as "square" | "round" | "rectangle" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTable} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {floorPlan && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{floorPlan.name}</h2>
              <p className="text-sm text-slate-500">
                Drag tables to position them. Click to select.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNewTableDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Table
              </Button>
              <Button onClick={handleSavePositions} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Layout
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <Card>
            <CardContent className="p-4">
              <div
                ref={canvasRef}
                className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg overflow-hidden"
                style={{ width: canvasWidth, height: canvasHeight }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    backgroundImage:
                      "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                  }}
                />

                {/* Tables */}
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={cn(
                      "absolute flex flex-col items-center justify-center cursor-move border-2 bg-white shadow-sm transition-shadow",
                      table.shape === "round" ? "rounded-full" : "rounded-lg",
                      table.shape === "rectangle" ? "w-24 h-16" : "w-16 h-16",
                      selectedTable === table.id
                        ? "border-primary shadow-md ring-2 ring-primary/20"
                        : "border-slate-300 hover:border-slate-400"
                    )}
                    style={{ left: table.x, top: table.y }}
                    onMouseDown={(e) => handleMouseDown(e, table.id)}
                  >
                    <span className="font-bold text-sm">{table.tableNumber}</span>
                    <span className="text-xs text-slate-500">{table.capacity} seats</span>
                    {selectedTable === table.id && (
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTable(table.id)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Move className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Click &quot;Add Table&quot; to get started</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default FloorPlanEditor
