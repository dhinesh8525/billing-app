"use client"

/**
 * Thermal Invoice Template
 *
 * Compact receipt-style invoice for thermal printers (58mm or 80mm width).
 * Based on typical POS receipt format.
 */

import { forwardRef } from "react"

interface InvoiceItem {
  sn: number
  name: string
  quantity: number
  price: number
  amount: number
  taxInfo?: string
}

interface InvoiceData {
  // Business info
  businessName: string
  businessTagline?: string
  businessAddress: string
  businessPhone: string
  gstin?: string

  // Invoice details
  invoiceNumber: string
  invoiceDate: string

  // Customer info (optional for receipts)
  customerName?: string
  customerPhone?: string

  // Items
  items: InvoiceItem[]

  // Totals
  subtotal: number
  discount?: number
  discountPercent?: number
  cgst?: number
  cgstRate?: number
  sgst?: number
  sgstRate?: number
  igst?: number
  igstRate?: number
  roundOff?: number
  total: number

  // Footer
  thankYouMessage?: string
}

interface TemplateSettings {
  width?: "58mm" | "80mm"
  showGstin?: boolean
  showTaxBreakup?: boolean
  fontSize?: "small" | "medium"
}

interface InvoiceTemplateThermalProps {
  invoice: InvoiceData
  settings?: TemplateSettings
}

export const InvoiceTemplateThermal = forwardRef<
  HTMLDivElement,
  InvoiceTemplateThermalProps
>(function InvoiceTemplateThermal({ invoice, settings = {} }, ref) {
  const {
    width = "80mm",
    showGstin = true,
    showTaxBreakup = true,
    fontSize = "small",
  } = settings

  const fontSizeClass = fontSize === "small" ? "text-[10px]" : "text-xs"
  const headerSize = fontSize === "small" ? "text-sm" : "text-base"
  const maxWidth = width === "58mm" ? "58mm" : "80mm"

  // Format currency without symbol for compact display
  function formatAmount(amount: number) {
    return amount.toFixed(2)
  }

  return (
    <div
      ref={ref}
      className={`bg-white p-2 mx-auto ${fontSizeClass}`}
      style={{
        width: maxWidth,
        maxWidth: maxWidth,
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h1 className={`font-bold ${headerSize}`}>{invoice.businessName}</h1>
        {invoice.businessTagline && (
          <p className="text-gray-600">{invoice.businessTagline}</p>
        )}
        <p className="text-gray-600 whitespace-pre-line text-[9px]">
          {invoice.businessAddress}
        </p>
        <p className="text-gray-600">Ph: {invoice.businessPhone}</p>
        {showGstin && invoice.gstin && (
          <p className="text-gray-600">GSTIN: {invoice.gstin}</p>
        )}
      </div>

      {/* Invoice Details */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Bill No: {invoice.invoiceNumber}</span>
          <span>Date: {invoice.invoiceDate}</span>
        </div>
        {invoice.customerName && (
          <div className="mt-1">
            <span>Customer: {invoice.customerName}</span>
          </div>
        )}
      </div>

      {/* Items Header */}
      <div className="border-b border-gray-400 pb-1 mb-1">
        <div className="flex font-bold">
          <span className="w-5">SN</span>
          <span className="flex-1">Item</span>
          <span className="w-8 text-center">Qty</span>
          <span className="w-12 text-right">Price</span>
          <span className="w-14 text-right">Amt</span>
        </div>
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        {invoice.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex">
              <span className="w-5">{item.sn}</span>
              <span className="flex-1 truncate">{item.name}</span>
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="w-12 text-right">{formatAmount(item.price)}</span>
              <span className="w-14 text-right">
                {formatAmount(item.amount)}
              </span>
            </div>
            {item.taxInfo && (
              <div className="text-gray-500 text-[8px] pl-5">{item.taxInfo}</div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹ {formatAmount(invoice.subtotal)}</span>
        </div>

        {invoice.discount !== undefined && invoice.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>
              Discount
              {invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ""}
            </span>
            <span>- ₹ {formatAmount(invoice.discount)}</span>
          </div>
        )}

        {showTaxBreakup && (
          <>
            {invoice.cgst !== undefined && invoice.cgst > 0 && (
              <div className="flex justify-between">
                <span>CGST {invoice.cgstRate ? `@ ${invoice.cgstRate}%` : ""}</span>
                <span>₹ {formatAmount(invoice.cgst)}</span>
              </div>
            )}
            {invoice.sgst !== undefined && invoice.sgst > 0 && (
              <div className="flex justify-between">
                <span>SGST {invoice.sgstRate ? `@ ${invoice.sgstRate}%` : ""}</span>
                <span>₹ {formatAmount(invoice.sgst)}</span>
              </div>
            )}
            {invoice.igst !== undefined && invoice.igst > 0 && (
              <div className="flex justify-between">
                <span>IGST {invoice.igstRate ? `@ ${invoice.igstRate}%` : ""}</span>
                <span>₹ {formatAmount(invoice.igst)}</span>
              </div>
            )}
          </>
        )}

        {invoice.roundOff !== undefined && invoice.roundOff !== 0 && (
          <div className="flex justify-between">
            <span>Round Off</span>
            <span>
              {invoice.roundOff > 0 ? "+" : ""} ₹ {formatAmount(invoice.roundOff)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="font-bold text-base border-b border-double border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>TOTAL</span>
          <span>₹ {formatAmount(invoice.total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-600">
        <p>{invoice.thankYouMessage || "Thank You"}</p>
      </div>
    </div>
  )
})
