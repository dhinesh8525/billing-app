"use client"

/**
 * A4 Invoice Template
 *
 * Professional A4-sized invoice template for standard printing.
 * Based on typical invoice format with header, bill-to/ship-to, items table.
 */

import { forwardRef } from "react"

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface InvoiceData {
  // Business info
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail?: string
  gstin?: string

  // Invoice details
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  terms?: string

  // Customer info
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  customerGstin?: string

  // Ship to (optional)
  shipToName?: string
  shipToAddress?: string
  shipToPhone?: string

  // Items
  items: InvoiceItem[]

  // Totals
  subtotal: number
  discount?: number
  discountPercent?: number
  taxRate?: number
  cgst?: number
  sgst?: number
  igst?: number
  roundOff?: number
  total: number

  // Footer
  termsAndConditions?: string
  thankYouMessage?: string
  footerNote?: string
}

interface TemplateSettings {
  showLogo?: boolean
  logoUrl?: string
  primaryColor?: string
  showHsn?: boolean
  showShipTo?: boolean
  showTerms?: boolean
  showSignature?: boolean
}

interface InvoiceTemplateA4Props {
  invoice: InvoiceData
  settings?: TemplateSettings
}

export const InvoiceTemplateA4 = forwardRef<HTMLDivElement, InvoiceTemplateA4Props>(
  function InvoiceTemplateA4({ invoice, settings = {} }, ref) {
    const {
      primaryColor = "#4B5563",
      showShipTo = true,
      showTerms = true,
    } = settings

    // Format currency
    function formatCurrency(amount: number) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(amount)
    }

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-[210mm] mx-auto"
        style={{ minHeight: "297mm", fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.businessName}
            </h1>
            <p className="text-sm text-gray-600 whitespace-pre-line mt-1">
              {invoice.businessAddress}
            </p>
            {invoice.businessPhone && (
              <p className="text-sm text-gray-600">
                Phone: {invoice.businessPhone}
              </p>
            )}
            {invoice.businessEmail && (
              <p className="text-sm text-gray-600">
                Email: {invoice.businessEmail}
              </p>
            )}
            {invoice.gstin && (
              <p className="text-sm text-gray-600">GSTIN: {invoice.gstin}</p>
            )}
          </div>

          <div className="text-right">
            <h2
              className="text-3xl font-bold"
              style={{ color: primaryColor }}
            >
              INVOICE
            </h2>
            <table className="mt-4 text-sm">
              <tbody>
                <tr>
                  <td
                    className="px-2 py-1 text-white text-right"
                    style={{ backgroundColor: primaryColor }}
                  >
                    INVOICE #
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {invoice.invoiceNumber}
                  </td>
                </tr>
                <tr>
                  <td
                    className="px-2 py-1 text-white text-right"
                    style={{ backgroundColor: primaryColor }}
                  >
                    DATE
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {invoice.invoiceDate}
                  </td>
                </tr>
                {invoice.terms && (
                  <tr>
                    <td
                      className="px-2 py-1 text-white text-right"
                      style={{ backgroundColor: primaryColor }}
                    >
                      TERMS
                    </td>
                    <td className="px-2 py-1 border text-center">
                      {invoice.terms}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div
              className="text-white text-sm font-semibold px-3 py-1.5 mb-2"
              style={{ backgroundColor: primaryColor }}
            >
              BILL TO
            </div>
            <div className="text-sm">
              {invoice.customerName && (
                <p className="font-medium">{invoice.customerName}</p>
              )}
              {invoice.customerAddress && (
                <p className="text-gray-600 whitespace-pre-line">
                  {invoice.customerAddress}
                </p>
              )}
              {invoice.customerPhone && (
                <p className="text-gray-600">Phone: {invoice.customerPhone}</p>
              )}
              {invoice.customerEmail && (
                <p className="text-gray-600">Email: {invoice.customerEmail}</p>
              )}
              {invoice.customerGstin && (
                <p className="text-gray-600">GSTIN: {invoice.customerGstin}</p>
              )}
              {!invoice.customerName && (
                <p className="text-gray-400 italic">Walk-in Customer</p>
              )}
            </div>
          </div>

          {showShipTo && (
            <div>
              <div
                className="text-white text-sm font-semibold px-3 py-1.5 mb-2"
                style={{ backgroundColor: primaryColor }}
              >
                SHIP TO
              </div>
              <div className="text-sm">
                {invoice.shipToName ? (
                  <>
                    <p className="font-medium">{invoice.shipToName}</p>
                    {invoice.shipToAddress && (
                      <p className="text-gray-600 whitespace-pre-line">
                        {invoice.shipToAddress}
                      </p>
                    )}
                    {invoice.shipToPhone && (
                      <p className="text-gray-600">
                        Phone: {invoice.shipToPhone}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 italic">Same as billing</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full mb-8 text-sm">
          <thead>
            <tr style={{ backgroundColor: primaryColor }}>
              <th className="text-left text-white px-3 py-2 font-semibold">
                DESCRIPTION
              </th>
              <th className="text-center text-white px-3 py-2 font-semibold w-20">
                QTY
              </th>
              <th className="text-right text-white px-3 py-2 font-semibold w-28">
                UNIT PRICE
              </th>
              <th className="text-right text-white px-3 py-2 font-semibold w-28">
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
              >
                <td className="px-3 py-2 border-b">{item.description}</td>
                <td className="px-3 py-2 border-b text-center">
                  {item.quantity}
                </td>
                <td className="px-3 py-2 border-b text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-3 py-2 border-b text-right">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
            {/* Empty rows for minimum table height */}
            {invoice.items.length < 5 &&
              Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="px-3 py-2 border-b">&nbsp;</td>
                  <td className="px-3 py-2 border-b"></td>
                  <td className="px-3 py-2 border-b"></td>
                  <td className="px-3 py-2 border-b"></td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-between mb-8">
          <div className="text-sm text-gray-600 max-w-md">
            {invoice.thankYouMessage && (
              <p className="italic">{invoice.thankYouMessage}</p>
            )}
          </div>

          <table className="text-sm">
            <tbody>
              <tr>
                <td className="px-4 py-1.5 text-right">Subtotal</td>
                <td className="px-4 py-1.5 text-right font-medium">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              {invoice.discount !== undefined && invoice.discount > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-right">
                    Discount
                    {invoice.discountPercent
                      ? ` (${invoice.discountPercent}%)`
                      : ""}
                  </td>
                  <td className="px-4 py-1.5 text-right text-red-600">
                    -{formatCurrency(invoice.discount)}
                  </td>
                </tr>
              )}
              {invoice.cgst !== undefined && invoice.cgst > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-right">
                    CGST ({((invoice.taxRate || 0) / 2).toFixed(0)}%)
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {formatCurrency(invoice.cgst)}
                  </td>
                </tr>
              )}
              {invoice.sgst !== undefined && invoice.sgst > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-right">
                    SGST ({((invoice.taxRate || 0) / 2).toFixed(0)}%)
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {formatCurrency(invoice.sgst)}
                  </td>
                </tr>
              )}
              {invoice.igst !== undefined && invoice.igst > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-right">
                    IGST ({invoice.taxRate}%)
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {formatCurrency(invoice.igst)}
                  </td>
                </tr>
              )}
              {invoice.roundOff !== undefined && invoice.roundOff !== 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-right">Round Off</td>
                  <td className="px-4 py-1.5 text-right">
                    {invoice.roundOff > 0 ? "+" : ""}
                    {formatCurrency(invoice.roundOff)}
                  </td>
                </tr>
              )}
              <tr
                className="font-bold text-base"
                style={{ backgroundColor: primaryColor, color: "white" }}
              >
                <td className="px-4 py-2 text-right">TOTAL</td>
                <td className="px-4 py-2 text-right">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms & Conditions */}
        {showTerms && invoice.termsAndConditions && (
          <div className="mb-8 text-xs text-gray-600 border-t pt-4">
            <p className="font-semibold mb-1">Terms & Conditions:</p>
            <p className="whitespace-pre-line">{invoice.termsAndConditions}</p>
          </div>
        )}

        {/* Footer */}
        {invoice.footerNote && (
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p>{invoice.footerNote}</p>
          </div>
        )}
      </div>
    )
  }
)
