"use client"

/**
 * Party Form
 *
 * Reusable form for creating and editing customers/suppliers.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface PartyFormProps {
  party?: {
    id: string
    name: string
    phone: string | null
    email: string | null
    gstin: string | null
    pan: string | null
    billingAddress: string | null
    shippingAddress: string | null
    type: string
    openingBalance: number | { toNumber: () => number }
    creditLimit: number | { toNumber: () => number } | null
    creditDays: number
  }
}

export function PartyForm({ party }: PartyFormProps) {
  const router = useRouter()
  const isEditing = !!party

  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [name, setName] = useState(party?.name || "")
  const [phone, setPhone] = useState(party?.phone || "")
  const [email, setEmail] = useState(party?.email || "")
  const [gstin, setGstin] = useState(party?.gstin || "")
  const [pan, setPan] = useState(party?.pan || "")
  const [billingAddress, setBillingAddress] = useState(party?.billingAddress || "")
  const [shippingAddress, setShippingAddress] = useState(party?.shippingAddress || "")
  const [type, setType] = useState(party?.type || "customer")
  const [openingBalance, setOpeningBalance] = useState(
    party?.openingBalance
      ? typeof party.openingBalance === "number"
        ? party.openingBalance.toString()
        : party.openingBalance.toNumber().toString()
      : "0"
  )
  const [creditLimit, setCreditLimit] = useState(
    party?.creditLimit
      ? typeof party.creditLimit === "number"
        ? party.creditLimit.toString()
        : party.creditLimit.toNumber().toString()
      : ""
  )
  const [creditDays, setCreditDays] = useState(party?.creditDays?.toString() || "0")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const payload = {
      name,
      phone: phone || null,
      email: email || null,
      gstin: gstin || null,
      pan: pan || null,
      billingAddress: billingAddress || null,
      shippingAddress: shippingAddress || null,
      type,
      openingBalance: parseFloat(openingBalance) || 0,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      creditDays: parseInt(creditDays) || 0,
    }

    try {
      const response = await fetch(
        isEditing ? `/api/parties/${party.id}` : "/api/parties",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save party")
      }

      toast.success(isEditing ? "Party updated" : "Party created")
      router.push("/parties")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save party")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name, contact details, and type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Party Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter customer/supplier name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>GSTIN and PAN details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g., 29AAACR5055K1ZK"
                maxLength={15}
              />
              <p className="text-xs text-slate-500">15-character GST Identification Number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g., AAACR5055K"
                maxLength={10}
              />
              <p className="text-xs text-slate-500">10-character Permanent Account Number</p>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Billing and shipping addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billingAddress">Billing Address</Label>
              <Textarea
                id="billingAddress"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Enter billing address"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingAddress">Shipping Address</Label>
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter shipping address (if different)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Credit Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Settings</CardTitle>
            <CardDescription>Opening balance and credit terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500">
                Positive = they owe you, Negative = you owe them
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditDays">Credit Days</Label>
                <Input
                  id="creditDays"
                  type="number"
                  min="0"
                  max="365"
                  value={creditDays}
                  onChange={(e) => setCreditDays(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Party" : "Create Party"}
        </Button>
      </div>
    </form>
  )
}
