"use client"

/**
 * Invoice Print Button Component
 *
 * Provides print options for A4 and Thermal formats.
 */

import { useRef, useState, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Printer, FileText, ReceiptText, Loader2 } from "lucide-react"
import { InvoiceTemplateA4 } from "@/components/invoice/invoice-template-a4"
import { InvoiceTemplateThermal } from "@/components/invoice/invoice-template-thermal"

interface InvoiceItem {
  id: string
  productName: string
  productSku: string
  unitPrice: string | number
  quantity: number
  lineTotal: string | number
  hsn?: string
  taxRate?: string | number
  unit?: string
}

interface Party {
  name: string
  phone?: string
  gstin?: string
  billingAddress?: string
}

interface Invoice {
  invoiceNumber: string
  invoiceDate: Date | string
  status: string
  customerName?: string
  customerPhone?: string
  party?: Party
  items: InvoiceItem[]
  subtotal: string | number
  discountPercent?: string | number
  discountAmount?: string | number
  taxRate?: string | number
  cgst?: string | number
  sgst?: string | number
  igst?: string | number
  roundOff?: string | number
  total: string | number
  notes?: string
}

interface BusinessSettings {
  businessName: string
  address?: string
  phone?: string
  email?: string
  gstin?: string
}

interface PrintSettings {
  thankYouMessage?: string
  termsAndConditions?: string
  footerNote?: string
  a4PrimaryColor?: string
  a4ShowShipTo?: boolean
  a4ShowTerms?: boolean
  thermalWidth?: "58mm" | "80mm"
  thermalShowGstin?: boolean
  thermalShowTaxBreakup?: boolean
  thermalFontSize?: "small" | "medium"
}

interface InvoicePrintButtonProps {
  invoice: Invoice
  business: BusinessSettings
}

export function InvoicePrintButton({
  invoice,
  business,
}: InvoicePrintButtonProps) {
  const a4Ref = useRef<HTMLDivElement>(null)
  const thermalRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<PrintSettings>({})
  const [isPrinting, setIsPrinting] = useState(false)

  // Load print settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings")
        const data = await response.json()
        if (data.success && data.data.invoice) {
          setSettings(data.data.invoice)
        }
      } catch {
        // Use defaults
      }
    }
    loadSettings()
  }, [])

  // Format date
  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Build A4 invoice data
  const a4Data = {
    businessName: business.businessName,
    businessAddress: business.address || "",
    businessPhone: business.phone || "",
    businessEmail: business.email,
    gstin: business.gstin,

    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    terms: "Due on Receipt",

    customerName: invoice.party?.name || invoice.customerName,
    customerAddress: invoice.party?.billingAddress,
    customerPhone: invoice.party?.phone || invoice.customerPhone,
    customerGstin: invoice.party?.gstin,

    items: invoice.items.map((item) => ({
      description: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      amount: Number(item.lineTotal),
    })),

    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discountAmount || 0),
    discountPercent: Number(invoice.discountPercent || 0),
    taxRate: Number(invoice.taxRate || 0),
    cgst: Number(invoice.cgst || 0),
    sgst: Number(invoice.sgst || 0),
    igst: Number(invoice.igst || 0),
    roundOff: Number(invoice.roundOff || 0),
    total: Number(invoice.total),

    thankYouMessage: settings.thankYouMessage || "Thank you for your business!",
    termsAndConditions: settings.termsAndConditions,
    footerNote: settings.footerNote,
  }

  // Build thermal invoice data
  const thermalData = {
    businessName: business.businessName,
    businessAddress: business.address || "",
    businessPhone: business.phone || "",
    gstin: business.gstin,

    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),

    customerName: invoice.party?.name || invoice.customerName,

    items: invoice.items.map((item, idx) => ({
      sn: idx + 1,
      name: item.productName,
      quantity: item.quantity,
      price: Number(item.unitPrice),
      amount: Number(item.lineTotal),
      taxInfo: Number(item.taxRate) > 0 ? `Tax ${item.taxRate}%` : undefined,
    })),

    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discountAmount || 0),
    discountPercent: Number(invoice.discountPercent || 0),
    cgst: Number(invoice.cgst || 0),
    cgstRate: Number(invoice.taxRate || 0) / 2,
    sgst: Number(invoice.sgst || 0),
    sgstRate: Number(invoice.taxRate || 0) / 2,
    igst: Number(invoice.igst || 0),
    igstRate: Number(invoice.taxRate || 0),
    roundOff: Number(invoice.roundOff || 0),
    total: Number(invoice.total),

    thankYouMessage: settings.thankYouMessage || "Thank You",
  }

  // Print handlers
  const handlePrintA4 = useReactToPrint({
    contentRef: a4Ref,
    documentTitle: `Invoice-${invoice.invoiceNumber}`,
    onBeforePrint: () => {
      setIsPrinting(true)
      return Promise.resolve()
    },
    onAfterPrint: () => setIsPrinting(false),
  })

  const handlePrintThermal = useReactToPrint({
    contentRef: thermalRef,
    documentTitle: `Receipt-${invoice.invoiceNumber}`,
    pageStyle: `
      @page {
        size: ${settings.thermalWidth || "80mm"} auto;
        margin: 0;
      }
    `,
    onBeforePrint: () => {
      setIsPrinting(true)
      return Promise.resolve()
    },
    onAfterPrint: () => setIsPrinting(false),
  })

  return (
    <>
      {/* Hidden print templates */}
      <div className="hidden">
        <InvoiceTemplateA4
          ref={a4Ref}
          invoice={a4Data}
          settings={{
            primaryColor: settings.a4PrimaryColor || "#4B5563",
            showShipTo: settings.a4ShowShipTo ?? false,
            showTerms: settings.a4ShowTerms ?? true,
          }}
        />
        <InvoiceTemplateThermal
          ref={thermalRef}
          invoice={thermalData}
          settings={{
            width: settings.thermalWidth || "80mm",
            showGstin: settings.thermalShowGstin ?? true,
            showTaxBreakup: settings.thermalShowTaxBreakup ?? true,
            fontSize: settings.thermalFontSize || "small",
          }}
        />
      </div>

      {/* Print dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handlePrintA4()}>
            <FileText className="h-4 w-4 mr-2" />
            Print A4 Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePrintThermal()}>
            <ReceiptText className="h-4 w-4 mr-2" />
            Print Thermal Receipt
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
