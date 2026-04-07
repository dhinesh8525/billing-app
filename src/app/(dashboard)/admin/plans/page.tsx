"use client"

/**
 * Admin Plans Management Page
 *
 * View and manage subscription plans.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2,
  ShieldAlert,
  CreditCard,
  Plus,
  Edit,
  Star,
  Users,
} from "lucide-react"

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billingInterval: string
  features: Record<string, unknown>
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  subscriberCount: number
  razorpayPlanId: string | null
}

interface PlanFormData {
  name: string
  slug: string
  description: string
  price: number
  billingInterval: string
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  features: {
    maxUsers: number
    maxProducts: number
    maxInvoicesPerMonth: number
    advancedReports: boolean
    apiAccess: boolean
    prioritySupport: boolean
  }
}

const defaultFormData: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  billingInterval: "MONTHLY",
  isActive: true,
  isPopular: false,
  sortOrder: 0,
  features: {
    maxUsers: 1,
    maxProducts: 50,
    maxInvoicesPerMonth: 100,
    advancedReports: false,
    apiAccess: false,
    prioritySupport: false,
  },
}

export default function AdminPlansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    loadPlans()
  }, [session, status, router])

  async function loadPlans() {
    try {
      const response = await fetch("/api/admin/plans")
      const result = await response.json()

      if (result.success) {
        setPlans(result.data)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to load plans")
    } finally {
      setIsLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingPlan(null)
    setFormData(defaultFormData)
    setIsEditOpen(true)
  }

  function openEditDialog(plan: Plan) {
    setEditingPlan(plan.id)
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: plan.price,
      billingInterval: plan.billingInterval,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      features: {
        maxUsers: (plan.features as Record<string, number>).maxUsers || 1,
        maxProducts: (plan.features as Record<string, number>).maxProducts || 50,
        maxInvoicesPerMonth: (plan.features as Record<string, number>).maxInvoicesPerMonth || 100,
        advancedReports: (plan.features as Record<string, boolean>).advancedReports || false,
        apiAccess: (plan.features as Record<string, boolean>).apiAccess || false,
        prioritySupport: (plan.features as Record<string, boolean>).prioritySupport || false,
      },
    })
    setIsEditOpen(true)
  }

  async function handleSave() {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required")
      return
    }

    setIsSaving(true)
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan}`
        : "/api/admin/plans"
      const method = editingPlan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          price: formData.price,
          billingInterval: formData.billingInterval,
          isActive: formData.isActive,
          isPopular: formData.isPopular,
          sortOrder: formData.sortOrder,
          features: formData.features,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingPlan ? "Plan updated" : "Plan created")
        setIsEditOpen(false)
        loadPlans()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to save plan")
    } finally {
      setIsSaving(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
          <p className="text-slate-500">Manage subscription plans</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Plans
          </CardTitle>
          <CardDescription>
            Configure pricing and features for each plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {plan.isPopular && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{plan.slug}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-slate-500">
                        /{plan.billingInterval === "YEARLY" ? "yr" : "mo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-500">
                      <p>
                        {(plan.features as Record<string, number>).maxUsers || "∞"} users
                      </p>
                      <p>
                        {(plan.features as Record<string, number>).maxProducts || "∞"} products
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-slate-400" />
                      {plan.subscriberCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create Plan"}
            </DialogTitle>
            <DialogDescription>
              Configure plan details, pricing, and feature limits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                  placeholder="pro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Perfect for growing businesses"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (INR)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select
                  value={formData.billingInterval}
                  onValueChange={(v) =>
                    setFormData({ ...formData, billingInterval: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-4">
              <h4 className="font-medium">Feature Limits</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={formData.features.maxUsers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features,
                          maxUsers: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxProducts">Max Products</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    min="1"
                    value={formData.features.maxProducts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features,
                          maxProducts: parseInt(e.target.value) || 50,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxInvoices">Max Invoices/Month</Label>
                  <Input
                    id="maxInvoices"
                    type="number"
                    min="1"
                    value={formData.features.maxInvoicesPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features,
                          maxInvoicesPerMonth: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-4">
              <h4 className="font-medium">Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Advanced Reports</Label>
                  <Switch
                    checked={formData.features.advancedReports}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, advancedReports: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>API Access</Label>
                  <Switch
                    checked={formData.features.apiAccess}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, apiAccess: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Priority Support</Label>
                  <Switch
                    checked={formData.features.prioritySupport}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, prioritySupport: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPopular: checked })
                  }
                />
                <Label htmlFor="isPopular">Popular Badge</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
