"use client"

/**
 * Bill Format Customization Page
 *
 * Customize invoice/bill appearance for both A4 and thermal printing.
 * Layout: Settings on left, large preview on right.
 */

import { useState, useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Printer,
  Save,
  Loader2,
  FileText,
  ReceiptText,
  Eye,
  Palette,
} from "lucide-react"
import { InvoiceTemplateA4 } from "@/components/invoice/invoice-template-a4"
import { InvoiceTemplateThermal } from "@/components/invoice/invoice-template-thermal"
import { cn } from "@/lib/utils"

// Sample invoice data for preview
const sampleInvoiceA4 = {
  businessName: "Sleek Electronics",
  businessAddress: "123 Main Street\nMumbai, Maharashtra 400001",
  businessPhone: "+91 9876543210",
  businessEmail: "contact@sleekelectronics.com",
  gstin: "27AABCS1234F1ZN",

  invoiceNumber: "INV-2024-001",
  invoiceDate: "23-Jan-2025",
  terms: "Net 30 Days",

  customerName: "Rahul Sharma",
  customerAddress: "456 Park Avenue\nPune, Maharashtra 411001",
  customerPhone: "+91 9123456789",
  customerEmail: "rahul@example.com",

  shipToName: "Rahul Sharma",
  shipToAddress: "456 Park Avenue\nPune, Maharashtra 411001",
  shipToPhone: "+91 9123456789",

  items: [
    { description: "Wireless Mouse", quantity: 2, unitPrice: 599, amount: 1198 },
    { description: "USB-C Hub", quantity: 1, unitPrice: 1299, amount: 1299 },
    { description: "Laptop Stand", quantity: 1, unitPrice: 899, amount: 899 },
  ],

  subtotal: 3396,
  discount: 340,
  discountPercent: 10,
  taxRate: 18,
  cgst: 275,
  sgst: 275,
  total: 3606,

  thankYouMessage: "Thank you for your business!",
  termsAndConditions:
    "1. Goods once sold will not be taken back.\n2. All disputes are subject to local jurisdiction.",
  footerNote:
    "If you have any questions about this invoice, please contact us at contact@sleekelectronics.com",
}

const sampleInvoiceThermal = {
  businessName: "SLEEK BILL",
  businessTagline: "Your Trusted Partner",
  businessAddress: "Nirmal Vijar, Panchshil Square\nNagpur, Maharashtra 440012",
  businessPhone: "+91 9123456789",
  gstin: "27AAFCV2469G1Z7",

  invoiceNumber: "IN-15",
  invoiceDate: "23-Jan-2025",

  customerName: "Walk-in Customer",

  items: [
    { sn: 1, name: "Orange Powder", quantity: 4, price: 100, amount: 448, taxInfo: "Tax Item" },
    { sn: 2, name: "Walnuts 5%", quantity: 1, price: 100, amount: 105, taxInfo: "Tax Item" },
    { sn: 3, name: "Coin 3% Tax", quantity: 1, price: 100, amount: 103, taxInfo: "Tax Item" },
    { sn: 4, name: "Rose Water", quantity: 1, price: 150, amount: 150 },
    { sn: 5, name: "Glycerine", quantity: 5, price: 100, amount: 500 },
    { sn: 6, name: "Cheese 12%", quantity: 1, price: 100, amount: 112, taxInfo: "Tax Item" },
  ],

  subtotal: 900,
  cgst: 3,
  cgstRate: 0,
  sgst: 3,
  sgstRate: 0,
  igst: 62,
  igstRate: 0,
  total: 968,

  thankYouMessage: "Thank You",
}

interface BillFormatSettings {
  // A4 Settings
  a4PrimaryColor: string
  a4ShowShipTo: boolean
  a4ShowTerms: boolean
  a4ShowSignature: boolean

  // Thermal Settings
  thermalWidth: "58mm" | "80mm"
  thermalShowGstin: boolean
  thermalShowTaxBreakup: boolean
  thermalFontSize: "small" | "medium"

  // Common
  thankYouMessage: string
  termsAndConditions: string
  footerNote: string
}

export default function BillFormatPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeFormat, setActiveFormat] = useState<"a4" | "thermal">("a4")

  const a4Ref = useRef<HTMLDivElement>(null)
  const thermalRef = useRef<HTMLDivElement>(null)

  const [settings, setSettings] = useState<BillFormatSettings>({
    a4PrimaryColor: "#4B5563",
    a4ShowShipTo: true,
    a4ShowTerms: true,
    a4ShowSignature: false,

    thermalWidth: "80mm",
    thermalShowGstin: true,
    thermalShowTaxBreakup: true,
    thermalFontSize: "small",

    thankYouMessage: "Thank you for your business!",
    termsAndConditions: "",
    footerNote: "",
  })

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings")
        const data = await response.json()

        if (data.success && data.data.invoice) {
          const inv = data.data.invoice
          setSettings((prev) => ({
            ...prev,
            a4PrimaryColor: inv.a4PrimaryColor || "#4B5563",
            a4ShowShipTo: inv.a4ShowShipTo ?? true,
            a4ShowTerms: inv.a4ShowTerms ?? true,
            a4ShowSignature: inv.a4ShowSignature ?? false,
            thermalWidth: inv.thermalWidth || "80mm",
            thermalShowGstin: inv.thermalShowGstin ?? true,
            thermalShowTaxBreakup: inv.thermalShowTaxBreakup ?? true,
            thermalFontSize: inv.thermalFontSize || "small",
            thankYouMessage: inv.thankYouMessage || "Thank you for your business!",
            termsAndConditions: inv.termsAndConditions || "",
            footerNote: inv.footerNote || "",
          }))
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings
  async function handleSave() {
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: {
            a4PrimaryColor: settings.a4PrimaryColor,
            a4ShowShipTo: settings.a4ShowShipTo,
            a4ShowTerms: settings.a4ShowTerms,
            a4ShowSignature: settings.a4ShowSignature,
            thermalWidth: settings.thermalWidth,
            thermalShowGstin: settings.thermalShowGstin,
            thermalShowTaxBreakup: settings.thermalShowTaxBreakup,
            thermalFontSize: settings.thermalFontSize,
            thankYouMessage: settings.thankYouMessage,
            termsAndConditions: settings.termsAndConditions,
            footerNote: settings.footerNote,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      toast.success("Bill format settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  // Print handlers
  const handlePrintA4 = useReactToPrint({
    contentRef: a4Ref,
    documentTitle: "Invoice Preview",
  })

  const handlePrintThermal = useReactToPrint({
    contentRef: thermalRef,
    documentTitle: "Receipt Preview",
    pageStyle: `
      @page {
        size: ${settings.thermalWidth} auto;
        margin: 0;
      }
    `,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bill Format</h1>
          <p className="text-slate-500">
            Customize your invoice and receipt appearance
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Main Layout: Settings Left, Preview Right */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Panel - Settings */}
        <div className="space-y-4">
          {/* Format Selector - Compact Tabs */}
          <div className="flex rounded-lg border bg-slate-100 p-1">
            <button
              onClick={() => setActiveFormat("a4")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeFormat === "a4"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileText className="h-4 w-4" />
              A4 Invoice
            </button>
            <button
              onClick={() => setActiveFormat("thermal")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeFormat === "thermal"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ReceiptText className="h-4 w-4" />
              Thermal
            </button>
          </div>

          {/* A4 Settings */}
          {activeFormat === "a4" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4" />
                  Invoice Settings
                </CardTitle>
                <CardDescription>
                  Customize A4 invoice appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.a4PrimaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          a4PrimaryColor: e.target.value,
                        })
                      }
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.a4PrimaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          a4PrimaryColor: e.target.value,
                        })
                      }
                      className="flex-1"
                      placeholder="#4B5563"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Ship To</Label>
                    <p className="text-xs text-slate-500">
                      Separate shipping address
                    </p>
                  </div>
                  <Switch
                    checked={settings.a4ShowShipTo}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, a4ShowShipTo: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Terms</Label>
                    <p className="text-xs text-slate-500">
                      Terms at the bottom
                    </p>
                  </div>
                  <Switch
                    checked={settings.a4ShowTerms}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, a4ShowTerms: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Signature Line</Label>
                    <p className="text-xs text-slate-500">
                      Authorized signatory
                    </p>
                  </div>
                  <Switch
                    checked={settings.a4ShowSignature}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, a4ShowSignature: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thermal Settings */}
          {activeFormat === "thermal" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4" />
                  Receipt Settings
                </CardTitle>
                <CardDescription>
                  Configure thermal receipt format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Paper Width</Label>
                  <Select
                    value={settings.thermalWidth}
                    onValueChange={(value: "58mm" | "80mm") =>
                      setSettings({ ...settings, thermalWidth: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (Narrow)</SelectItem>
                      <SelectItem value="80mm">80mm (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select
                    value={settings.thermalFontSize}
                    onValueChange={(value: "small" | "medium") =>
                      setSettings({ ...settings, thermalFontSize: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (More items)</SelectItem>
                      <SelectItem value="medium">Medium (Readable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show GSTIN</Label>
                    <p className="text-xs text-slate-500">
                      GST number on receipt
                    </p>
                  </div>
                  <Switch
                    checked={settings.thermalShowGstin}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, thermalShowGstin: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tax Breakup</Label>
                    <p className="text-xs text-slate-500">
                      CGST/SGST/IGST separately
                    </p>
                  </div>
                  <Switch
                    checked={settings.thermalShowTaxBreakup}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        thermalShowTaxBreakup: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Common Settings</CardTitle>
              <CardDescription>Apply to both formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thankYou">Thank You Message</Label>
                <Input
                  id="thankYou"
                  value={settings.thankYouMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, thankYouMessage: e.target.value })
                  }
                  placeholder="Thank you for your business!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={settings.termsAndConditions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      termsAndConditions: e.target.value,
                    })
                  }
                  placeholder="Enter terms and conditions..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer">Footer Note</Label>
                <Input
                  id="footer"
                  value={settings.footerNote}
                  onChange={(e) =>
                    setSettings({ ...settings, footerNote: e.target.value })
                  }
                  placeholder="Contact info or notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Print Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              activeFormat === "a4" ? handlePrintA4() : handlePrintThermal()
            }
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {activeFormat === "a4" ? "A4" : "Thermal"} Preview
          </Button>
        </div>

        {/* Right Panel - Large Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
            <CardDescription>
              {activeFormat === "a4" ? "A4 Invoice" : "Thermal Receipt"} Preview
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-slate-100 p-6 min-h-[70vh] overflow-auto">
            {activeFormat === "a4" ? (
              <div className="flex justify-center">
                <div className="transform scale-[0.6] origin-top w-[166%]">
                  <InvoiceTemplateA4
                    ref={a4Ref}
                    invoice={{
                      ...sampleInvoiceA4,
                      thankYouMessage:
                        settings.thankYouMessage || sampleInvoiceA4.thankYouMessage,
                      termsAndConditions:
                        settings.termsAndConditions ||
                        sampleInvoiceA4.termsAndConditions,
                      footerNote:
                        settings.footerNote || sampleInvoiceA4.footerNote,
                    }}
                    settings={{
                      primaryColor: settings.a4PrimaryColor,
                      showShipTo: settings.a4ShowShipTo,
                      showTerms: settings.a4ShowTerms,
                      showSignature: settings.a4ShowSignature,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <InvoiceTemplateThermal
                  ref={thermalRef}
                  invoice={{
                    ...sampleInvoiceThermal,
                    thankYouMessage:
                      settings.thankYouMessage ||
                      sampleInvoiceThermal.thankYouMessage,
                  }}
                  settings={{
                    width: settings.thermalWidth,
                    showGstin: settings.thermalShowGstin,
                    showTaxBreakup: settings.thermalShowTaxBreakup,
                    fontSize: settings.thermalFontSize,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
