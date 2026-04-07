"use client"

/**
 * Export Button Component
 *
 * Reusable button for CSV exports with optional date filtering.
 */

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Loader2, Calendar } from "lucide-react"

type ExportType = "products" | "invoices" | "invoice-items" | "parties" | "gst" | "hsn"

interface ExportButtonProps {
  type: ExportType
  label?: string
  showDateFilter?: boolean
  defaultStatus?: string
  partyType?: "CUSTOMER" | "SUPPLIER"
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportButton({
  type,
  label = "Export",
  showDateFilter = false,
  defaultStatus,
  partyType,
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  async function handleExport(withDates = false) {
    if (showDateFilter && !withDates) {
      setDateDialogOpen(true)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type })

      if (defaultStatus) {
        params.append("status", defaultStatus)
      }

      if (partyType) {
        params.append("partyType", partyType)
      }

      if (withDates && startDate) {
        params.append("startDate", startDate)
      }

      if (withDates && endDate) {
        params.append("endDate", endDate)
      }

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `${type}-export.csv`

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Export downloaded successfully")
      setDateDialogOpen(false)
    } catch {
      toast.error("Failed to export data")
    } finally {
      setIsLoading(false)
    }
  }

  if (showDateFilter) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={() => setDateDialogOpen(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>

        <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export {type.replace("-", " ")}</DialogTitle>
              <DialogDescription>
                Select a date range for the export (optional)
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                    setStartDate(firstDay.toISOString().split("T")[0])
                    setEndDate(today.toISOString().split("T")[0])
                  }}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
                    setStartDate(firstDay.toISOString().split("T")[0])
                    setEndDate(lastDay.toISOString().split("T")[0])
                  }}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Last Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const firstDay = new Date(today.getFullYear(), 0, 1)
                    setStartDate(firstDay.toISOString().split("T")[0])
                    setEndDate(today.toISOString().split("T")[0])
                  }}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  This Year
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleExport(true)} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Download CSV
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleExport(false)}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  )
}

interface ExportMenuProps {
  exports: {
    type: ExportType
    label: string
    showDateFilter?: boolean
    status?: string
    partyType?: "CUSTOMER" | "SUPPLIER"
  }[]
  buttonLabel?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportMenu({
  exports,
  buttonLabel = "Export",
  variant = "outline",
  size = "sm",
}: ExportMenuProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  const [selectedExport, setSelectedExport] = useState<(typeof exports)[0] | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  async function handleExport(exportConfig: (typeof exports)[0], withDates = false) {
    if (exportConfig.showDateFilter && !withDates) {
      setSelectedExport(exportConfig)
      setDateDialogOpen(true)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type: exportConfig.type })

      if (exportConfig.status) {
        params.append("status", exportConfig.status)
      }

      if (exportConfig.partyType) {
        params.append("partyType", exportConfig.partyType)
      }

      if (withDates && startDate) {
        params.append("startDate", startDate)
      }

      if (withDates && endDate) {
        params.append("endDate", endDate)
      }

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `${exportConfig.type}-export.csv`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Export downloaded successfully")
      setDateDialogOpen(false)
      setSelectedExport(null)
    } catch {
      toast.error("Failed to export data")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {buttonLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {exports.map((exportConfig, index) => (
            <div key={exportConfig.type + (exportConfig.partyType || "")}>
              {index > 0 && exports[index - 1].type !== exportConfig.type && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem onClick={() => handleExport(exportConfig)}>
                {exportConfig.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {selectedExport?.label}</DialogTitle>
            <DialogDescription>
              Select a date range for the export (optional)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                  setStartDate(firstDay.toISOString().split("T")[0])
                  setEndDate(today.toISOString().split("T")[0])
                }}
              >
                <Calendar className="h-3 w-3 mr-1" />
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
                  setStartDate(firstDay.toISOString().split("T")[0])
                  setEndDate(lastDay.toISOString().split("T")[0])
                }}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Last Month
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedExport && handleExport(selectedExport, true)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
