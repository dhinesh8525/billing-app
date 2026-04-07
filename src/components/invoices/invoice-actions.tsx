"use client"

/**
 * Invoice Actions Component
 *
 * Actions dropdown for invoice operations (cancel, record payment).
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, XCircle, CreditCard } from "lucide-react"
import { toast } from "sonner"

interface InvoiceActionsProps {
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    paymentStatus: string
  }
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleCancel() {
    setIsProcessing(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel invoice")
      }

      toast.success("Invoice cancelled successfully")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invoice"
      )
    } finally {
      setIsProcessing(false)
      setShowCancelDialog(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {invoice.paymentStatus !== "paid" && (
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCancelDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel invoice &quot;{invoice.invoiceNumber}&quot;?
              This will restore the stock for all items and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Keep Invoice
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Cancelling..." : "Cancel Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
