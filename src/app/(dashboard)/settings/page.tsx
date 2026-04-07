"use client"

/**
 * Settings Page
 *
 * Business configuration including company info, tax settings, and invoice preferences.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Building2,
  Receipt,
  Percent,
  Save,
  Loader2,
} from "lucide-react"

interface BusinessSettings {
  businessName: string
  gstin: string | null
  pan: string | null
  address: string
  phone: string | null
  email: string | null
  tagline: string | null
}

interface TaxSettings {
  defaultTaxRate: number
  enableGST: boolean
  gstType: "regular" | "composition"
  stateCode: string | null
}

interface InvoiceSettings {
  salePrefix: string
  purchasePrefix: string
  expensePrefix: string
  termsAndConditions: string | null
  thankYouMessage: string | null
  enableRoundOff: boolean
  showHSN: boolean
  showDiscount: boolean
  printFormat: "a4" | "thermal"
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Settings state
  const [business, setBusiness] = useState<BusinessSettings>({
    businessName: "",
    gstin: null,
    pan: null,
    address: "",
    phone: null,
    email: null,
    tagline: null,
  })

  const [tax, setTax] = useState<TaxSettings>({
    defaultTaxRate: 18,
    enableGST: true,
    gstType: "regular",
    stateCode: null,
  })

  const [invoice, setInvoice] = useState<InvoiceSettings>({
    salePrefix: "INV",
    purchasePrefix: "PUR",
    expensePrefix: "EXP",
    termsAndConditions: null,
    thankYouMessage: "Thank you for your business!",
    enableRoundOff: true,
    showHSN: true,
    showDiscount: true,
    printFormat: "a4",
  })

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/settings")
        const data = await response.json()

        if (data.success) {
          setBusiness(data.data.business)
          setTax(data.data.tax)
          setInvoice(data.data.invoice)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Save settings
  async function handleSave() {
    if (!isAdmin) {
      toast.error("Only admins can update settings")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, tax, invoice }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings")
      }

      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      )
    } finally {
      setIsSaving(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">
            Manage your business settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !isAdmin}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
          You need admin access to modify settings. Contact your administrator.
        </div>
      )}

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Tax / GST
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoice
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Your business details that appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={business.businessName}
                    onChange={(e) =>
                      setBusiness({ ...business, businessName: e.target.value })
                    }
                    placeholder="Your Business Name"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={business.tagline || ""}
                    onChange={(e) =>
                      setBusiness({ ...business, tagline: e.target.value || null })
                    }
                    placeholder="Your trusted partner"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={business.gstin || ""}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        gstin: e.target.value.toUpperCase() || null,
                      })
                    }
                    placeholder="29AABCB1234A1ZP"
                    maxLength={15}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={business.pan || ""}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        pan: e.target.value.toUpperCase() || null,
                      })
                    }
                    placeholder="AABCB1234A"
                    maxLength={10}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={business.address}
                  onChange={(e) =>
                    setBusiness({ ...business, address: e.target.value })
                  }
                  placeholder="Full business address"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={business.phone || ""}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10) || null,
                      })
                    }
                    placeholder="10-digit number"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={business.email || ""}
                    onChange={(e) =>
                      setBusiness({ ...business, email: e.target.value || null })
                    }
                    placeholder="business@example.com"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax / GST Settings</CardTitle>
              <CardDescription>
                Configure your GST and tax preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable GST</Label>
                  <p className="text-sm text-slate-500">
                    Calculate GST on all invoices
                  </p>
                </div>
                <Switch
                  checked={tax.enableGST}
                  onCheckedChange={(checked) =>
                    setTax({ ...tax, enableGST: checked })
                  }
                  disabled={!isAdmin}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                  <Select
                    value={tax.defaultTaxRate.toString()}
                    onValueChange={(value) =>
                      setTax({ ...tax, defaultTaxRate: parseInt(value) })
                    }
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstType">GST Registration Type</Label>
                  <Select
                    value={tax.gstType}
                    onValueChange={(value: "regular" | "composition") =>
                      setTax({ ...tax, gstType: value })
                    }
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="composition">Composition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateCode">State Code</Label>
                <Input
                  id="stateCode"
                  value={tax.stateCode || ""}
                  onChange={(e) =>
                    setTax({
                      ...tax,
                      stateCode: e.target.value.replace(/\D/g, "").slice(0, 2) || null,
                    })
                  }
                  placeholder="29"
                  maxLength={2}
                  className="w-24"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-slate-500">
                  2-digit state code for GSTIN
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>
                Customize invoice numbering and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="salePrefix">Sale Invoice Prefix</Label>
                  <Input
                    id="salePrefix"
                    value={invoice.salePrefix}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        salePrefix: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="INV"
                    maxLength={10}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrefix">Purchase Invoice Prefix</Label>
                  <Input
                    id="purchasePrefix"
                    value={invoice.purchasePrefix}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        purchasePrefix: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="PUR"
                    maxLength={10}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expensePrefix">Expense Prefix</Label>
                  <Input
                    id="expensePrefix"
                    value={invoice.expensePrefix}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        expensePrefix: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="EXP"
                    maxLength={10}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Round Off</Label>
                    <p className="text-sm text-slate-500">
                      Round invoice total to nearest rupee
                    </p>
                  </div>
                  <Switch
                    checked={invoice.enableRoundOff}
                    onCheckedChange={(checked) =>
                      setInvoice({ ...invoice, enableRoundOff: checked })
                    }
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show HSN/SAC Code</Label>
                    <p className="text-sm text-slate-500">
                      Display HSN codes on invoices
                    </p>
                  </div>
                  <Switch
                    checked={invoice.showHSN}
                    onCheckedChange={(checked) =>
                      setInvoice({ ...invoice, showHSN: checked })
                    }
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Discount Column</Label>
                    <p className="text-sm text-slate-500">
                      Display item-wise discounts
                    </p>
                  </div>
                  <Switch
                    checked={invoice.showDiscount}
                    onCheckedChange={(checked) =>
                      setInvoice({ ...invoice, showDiscount: checked })
                    }
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                <Textarea
                  id="termsAndConditions"
                  value={invoice.termsAndConditions || ""}
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      termsAndConditions: e.target.value || null,
                    })
                  }
                  placeholder="Enter terms and conditions for invoices..."
                  rows={4}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thankYouMessage">Thank You Message</Label>
                <Input
                  id="thankYouMessage"
                  value={invoice.thankYouMessage || ""}
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      thankYouMessage: e.target.value || null,
                    })
                  }
                  placeholder="Thank you for your business!"
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
