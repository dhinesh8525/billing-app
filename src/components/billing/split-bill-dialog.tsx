"use client"

/**
 * Split Bill Dialog
 *
 * Dialog for splitting a bill by items, percentage, or equally.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"
import { Loader2, Plus, Minus, Scissors } from "lucide-react"

interface InvoiceItem {
  id: string
  productName: string
  quantity: number
  lineTotal: number | { toNumber?: () => number }
}

interface SplitBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceTotal: number
  items: InvoiceItem[]
  onSuccess?: () => void
}

export function SplitBillDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceTotal,
  items,
  onSuccess,
}: SplitBillDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("equal")

  // Equal split state
  const [numberOfSplits, setNumberOfSplits] = useState(2)
  const [equalCustomerNames, setEqualCustomerNames] = useState<string[]>(["", ""])

  // Percentage split state
  const [percentages, setPercentages] = useState([
    { percentage: 50, customerName: "" },
    { percentage: 50, customerName: "" },
  ])

  // Items split state
  const [itemSplits, setItemSplits] = useState<Array<{
    selectedItems: Set<string>
    customerName: string
  }>>([
    { selectedItems: new Set(), customerName: "" },
    { selectedItems: new Set(), customerName: "" },
  ])

  const getLineTotal = (total: InvoiceItem["lineTotal"]) => {
    if (typeof total === "object" && total?.toNumber) {
      return total.toNumber()
    }
    return Number(total)
  }

  // Handle equal split submission
  const handleEqualSplit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/bills/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "equal",
          invoiceId,
          numberOfSplits,
          customerNames: equalCustomerNames.filter(Boolean),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(`Bill split into ${numberOfSplits} equal parts`)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to split bill")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle percentage split submission
  const handlePercentageSplit = async () => {
    const total = percentages.reduce((sum, p) => sum + p.percentage, 0)
    if (Math.abs(total - 100) > 0.01) {
      toast.error("Percentages must add up to 100%")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/bills/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "percentage",
          invoiceId,
          splits: percentages,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success("Bill split by percentage")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to split bill")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle items split submission
  const handleItemsSplit = async () => {
    const allSelected = itemSplits.flatMap((s) => Array.from(s.selectedItems))
    if (allSelected.length === 0) {
      toast.error("Please select items for each split")
      return
    }

    // Check for duplicate assignments
    const uniqueItems = new Set(allSelected)
    if (uniqueItems.size !== allSelected.length) {
      toast.error("Each item can only be assigned to one split")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/bills/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "items",
          invoiceId,
          splits: itemSplits
            .filter((s) => s.selectedItems.size > 0)
            .map((s) => ({
              itemIds: Array.from(s.selectedItems),
              customerName: s.customerName || null,
            })),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success("Bill split by items")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to split bill")
    } finally {
      setIsLoading(false)
    }
  }

  // Update number of splits for equal split
  const updateEqualSplits = (count: number) => {
    setNumberOfSplits(count)
    setEqualCustomerNames(Array(count).fill(""))
  }

  // Add/remove percentage split
  const addPercentageSplit = () => {
    setPercentages([...percentages, { percentage: 0, customerName: "" }])
  }

  const removePercentageSplit = (index: number) => {
    if (percentages.length <= 2) return
    setPercentages(percentages.filter((_, i) => i !== index))
  }

  // Add/remove items split
  const addItemsSplit = () => {
    setItemSplits([...itemSplits, { selectedItems: new Set(), customerName: "" }])
  }

  const removeItemsSplit = (index: number) => {
    if (itemSplits.length <= 2) return
    setItemSplits(itemSplits.filter((_, i) => i !== index))
  }

  const toggleItemSelection = (splitIndex: number, itemId: string) => {
    const newSplits = [...itemSplits]
    const split = newSplits[splitIndex]
    const newSelected = new Set(split.selectedItems)

    // Remove from other splits first
    newSplits.forEach((s, i) => {
      if (i !== splitIndex) {
        s.selectedItems.delete(itemId)
      }
    })

    // Toggle in current split
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }

    newSplits[splitIndex] = { ...split, selectedItems: newSelected }
    setItemSplits(newSplits)
  }

  const calculateSplitTotal = (selectedItems: Set<string>) => {
    return items
      .filter((item) => selectedItems.has(item.id))
      .reduce((sum, item) => sum + getLineTotal(item.lineTotal), 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Split Bill
          </DialogTitle>
          <DialogDescription>
            Total: {formatCurrency(invoiceTotal)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equal">Equal Split</TabsTrigger>
            <TabsTrigger value="percentage">By Percentage</TabsTrigger>
            <TabsTrigger value="items">By Items</TabsTrigger>
          </TabsList>

          {/* Equal Split */}
          <TabsContent value="equal" className="space-y-4">
            <div className="space-y-2">
              <Label>Number of splits</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => numberOfSplits > 2 && updateEqualSplits(numberOfSplits - 1)}
                  disabled={numberOfSplits <= 2}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-bold text-lg">{numberOfSplits}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => numberOfSplits < 20 && updateEqualSplits(numberOfSplits + 1)}
                  disabled={numberOfSplits >= 20}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-sm text-slate-600">Each person pays</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(invoiceTotal / numberOfSplits)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Customer names (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {equalCustomerNames.map((name, i) => (
                  <Input
                    key={i}
                    placeholder={`Guest ${i + 1}`}
                    value={name}
                    onChange={(e) => {
                      const newNames = [...equalCustomerNames]
                      newNames[i] = e.target.value
                      setEqualCustomerNames(newNames)
                    }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleEqualSplit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Split Equally
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Percentage Split */}
          <TabsContent value="percentage" className="space-y-4">
            <div className="space-y-3">
              {percentages.map((split, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={split.percentage}
                    onChange={(e) => {
                      const newPercentages = [...percentages]
                      newPercentages[index].percentage = parseFloat(e.target.value) || 0
                      setPercentages(newPercentages)
                    }}
                    className="w-20"
                  />
                  <span>%</span>
                  <Input
                    placeholder={`Guest ${index + 1}`}
                    value={split.customerName}
                    onChange={(e) => {
                      const newPercentages = [...percentages]
                      newPercentages[index].customerName = e.target.value
                      setPercentages(newPercentages)
                    }}
                    className="flex-1"
                  />
                  <span className="w-24 text-right font-medium">
                    {formatCurrency((invoiceTotal * split.percentage) / 100)}
                  </span>
                  {percentages.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePercentageSplit(index)}
                    >
                      <Minus className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addPercentageSplit}>
              <Plus className="mr-2 h-4 w-4" />
              Add Split
            </Button>

            <div className={cn(
              "p-3 rounded-lg text-sm",
              Math.abs(percentages.reduce((s, p) => s + p.percentage, 0) - 100) < 0.01
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}>
              Total: {percentages.reduce((s, p) => s + p.percentage, 0).toFixed(1)}%
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handlePercentageSplit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Split by Percentage
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Items Split */}
          <TabsContent value="items" className="space-y-4">
            <div className="space-y-4">
              {itemSplits.map((split, splitIndex) => (
                <div key={splitIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Split {splitIndex + 1}</span>
                      <span className="text-sm text-slate-500">
                        ({formatCurrency(calculateSplitTotal(split.selectedItems))})
                      </span>
                    </div>
                    {itemSplits.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemsSplit(splitIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Customer name (optional)"
                    value={split.customerName}
                    onChange={(e) => {
                      const newSplits = [...itemSplits]
                      newSplits[splitIndex].customerName = e.target.value
                      setItemSplits(newSplits)
                    }}
                    className="mb-3"
                  />
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={split.selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(splitIndex, item.id)}
                        />
                        <span className="flex-1">{item.productName}</span>
                        <span className="text-sm text-slate-500">x{item.quantity}</span>
                        <span className="font-medium">
                          {formatCurrency(getLineTotal(item.lineTotal))}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addItemsSplit}>
              <Plus className="mr-2 h-4 w-4" />
              Add Split
            </Button>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleItemsSplit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Split by Items
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default SplitBillDialog
