"use client"

/**
 * Payment QR Dialog Component
 *
 * Shows a UPI payment QR code for quick payment collection.
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UPIQRCode } from "./qr-code-display"
import { formatCurrency } from "@/lib/utils"
import { Copy, Check, QrCode, Smartphone } from "lucide-react"
import { toast } from "sonner"

interface PaymentQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  invoiceNumber: string
  customerName?: string
}

export function PaymentQRDialog({
  open,
  onOpenChange,
  amount,
  invoiceNumber,
  customerName,
}: PaymentQRDialogProps) {
  const [upiId, setUpiId] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [copied, setCopied] = useState(false)

  // Load saved UPI settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.success) {
          setUpiId(data.data.upiId || "")
          setBusinessName(data.data.businessName || "Business")
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      }
    }

    if (open) {
      fetchSettings()
    }
  }, [open])

  const transactionNote = `Payment for Invoice #${invoiceNumber}${customerName ? ` - ${customerName}` : ""}`

  const handleCopyUPI = () => {
    if (upiId) {
      navigator.clipboard.writeText(upiId)
      setCopied(true)
      toast.success("UPI ID copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Collect Payment via UPI
          </DialogTitle>
          <DialogDescription>
            Customer can scan this QR code to pay using any UPI app
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {upiId ? (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-sm border">
                  <UPIQRCode
                    upiId={upiId}
                    payeeName={businessName}
                    amount={amount}
                    transactionNote={transactionNote}
                    size={200}
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3 text-center">
                <div>
                  <p className="text-sm text-slate-500">Amount to Pay</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(amount)}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm text-slate-600">
                    UPI ID: <span className="font-mono">{upiId}</span>
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyUPI}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  How to pay:
                </p>
                <ol className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                      1
                    </span>
                    Open any UPI app (GPay, PhonePe, Paytm, etc.)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                      2
                    </span>
                    Scan this QR code
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                      3
                    </span>
                    Verify amount and complete payment
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                UPI ID not configured. Add your UPI ID in settings to enable QR payments.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Go to Settings
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
