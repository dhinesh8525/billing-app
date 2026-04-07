"use client"

/**
 * QR Code Display Component
 *
 * Displays QR codes for various purposes:
 * - UPI payment links
 * - Invoice sharing URLs
 * - Product information
 */

import QRCode from "react-qr-code"
import { cn } from "@/lib/utils"

interface QRCodeDisplayProps {
  value: string
  size?: number
  className?: string
  level?: "L" | "M" | "Q" | "H"
  bgColor?: string
  fgColor?: string
}

export function QRCodeDisplay({
  value,
  size = 128,
  className,
  level = "M",
  bgColor = "#ffffff",
  fgColor = "#000000",
}: QRCodeDisplayProps) {
  return (
    <div className={cn("inline-block p-2 bg-white rounded", className)}>
      <QRCode
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
      />
    </div>
  )
}

/**
 * UPI Payment QR Code
 *
 * Generates a UPI deep link QR code for payment collection.
 */
interface UPIQRCodeProps {
  upiId: string
  payeeName: string
  amount?: number
  transactionNote?: string
  size?: number
  className?: string
}

export function UPIQRCode({
  upiId,
  payeeName,
  amount,
  transactionNote,
  size = 200,
  className,
}: UPIQRCodeProps) {
  // Build UPI deep link
  // Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=NOTE
  const params = new URLSearchParams()
  params.set("pa", upiId)
  params.set("pn", payeeName)

  if (amount && amount > 0) {
    params.set("am", amount.toFixed(2))
  }

  if (transactionNote) {
    params.set("tn", transactionNote)
  }

  params.set("cu", "INR")

  const upiLink = `upi://pay?${params.toString()}`

  return (
    <div className={cn("text-center", className)}>
      <QRCodeDisplay value={upiLink} size={size} level="H" />
      <p className="text-xs text-slate-500 mt-2">
        Scan with any UPI app to pay
      </p>
    </div>
  )
}

/**
 * Invoice Share QR Code
 *
 * Generates a QR code for sharing an invoice URL.
 */
interface InvoiceQRCodeProps {
  invoiceUrl: string
  invoiceNumber: string
  size?: number
  className?: string
}

export function InvoiceQRCode({
  invoiceUrl,
  invoiceNumber,
  size = 150,
  className,
}: InvoiceQRCodeProps) {
  return (
    <div className={cn("text-center", className)}>
      <QRCodeDisplay value={invoiceUrl} size={size} />
      <p className="text-xs text-slate-500 mt-2">
        Scan to view invoice #{invoiceNumber}
      </p>
    </div>
  )
}
