"use client"

/**
 * Admin Tenant Detail Page
 *
 * View and manage a specific tenant.
 */

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
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
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Building2,
  Users,
  Package,
  FileText,
  IndianRupee,
  Crown,
  ShieldCheck,
  Shield,
  Power,
  Settings,
} from "lucide-react"

interface TenantDetail {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  gstin: string | null
  address: string | null
  city: string | null
  state: string | null
  isActive: boolean
  createdAt: string
  subscription: {
    id: string
    planId: string
    status: string
    currentPeriodEnd: string
    plan: {
      id: string
      name: string
      price: number
    }
  } | null
  memberships: {
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
      role: string
      lastLogin: string | null
    }
  }[]
  _count: {
    invoices: number
    products: number
    parties: number
  }
  revenue: number
  recentInvoices: {
    id: string
    invoiceNumber: string
    total: number
    status: string
    createdAt: string
  }[]
}

interface Plan {
  id: string
  name: string
  price: number
}

export default function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState({
    isActive: true,
    planId: "",
    status: "",
  })

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    loadTenant()
    loadPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, tenantId])

  async function loadTenant() {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`)
      const result = await response.json()

      if (result.success) {
        setTenant(result.data)
        setEditData({
          isActive: result.data.isActive,
          planId: result.data.subscription?.planId || "",
          status: result.data.subscription?.status || "",
        })
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to load tenant")
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPlans() {
    try {
      const response = await fetch("/api/admin/plans")
      const result = await response.json()
      if (result.success) {
        setPlans(result.data)
      }
    } catch {
      // Ignore
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: editData.isActive,
          subscription: {
            planId: editData.planId || undefined,
            status: editData.status || undefined,
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Tenant updated")
        setIsEditOpen(false)
        loadTenant()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to update tenant")
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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const roleIcons: Record<string, React.ReactNode> = {
    OWNER: <Crown className="h-4 w-4 text-amber-500" />,
    ADMIN: <ShieldCheck className="h-4 w-4 text-blue-500" />,
    MEMBER: <Shield className="h-4 w-4 text-slate-400" />,
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIALING: "bg-blue-100 text-blue-700",
    PAST_DUE: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-red-100 text-red-700",
    EXPIRED: "bg-slate-100 text-slate-700",
    PAUSED: "bg-purple-100 text-purple-700",
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

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Tenant Not Found</h2>
        <Button variant="ghost" className="mt-4" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/tenants">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {tenant.name}
              <Badge variant={tenant.isActive ? "default" : "secondary"}>
                {tenant.isActive ? "Active" : "Inactive"}
              </Badge>
            </h1>
            <p className="text-slate-500">{tenant.slug}</p>
          </div>
        </div>
        <Button onClick={() => setIsEditOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Manage
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant.memberships.length}</p>
                <p className="text-sm text-slate-500">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant._count.products}</p>
                <p className="text-sm text-slate-500">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant._count.invoices}</p>
                <p className="text-sm text-slate-500">Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(tenant.revenue)}</p>
                <p className="text-sm text-slate-500">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Email</p>
                <p>{tenant.email || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">Phone</p>
                <p>{tenant.phone || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">GSTIN</p>
                <p>{tenant.gstin || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">Created</p>
                <p>{formatDate(tenant.createdAt)}</p>
              </div>
              {tenant.address && (
                <div className="col-span-2">
                  <p className="text-slate-500">Address</p>
                  <p>
                    {tenant.address}
                    {tenant.city && `, ${tenant.city}`}
                    {tenant.state && `, ${tenant.state}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium">{tenant.subscription.plan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Price</span>
                  <span>{formatCurrency(tenant.subscription.plan.price)}/mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge className={statusColors[tenant.subscription.status]}>
                    {tenant.subscription.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Period Ends</span>
                  <span>{formatDate(tenant.subscription.currentPeriodEnd)}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No subscription</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.memberships.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-slate-500">{m.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {roleIcons[m.role]}
                      {m.role}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {m.user.lastLogin ? formatDate(m.user.lastLogin) : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      {tenant.recentInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(inv.total))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Workspace</DialogTitle>
            <DialogDescription>
              Update workspace status and subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Workspace Status</Label>
                <p className="text-sm text-slate-500">
                  Inactive workspaces cannot be accessed
                </p>
              </div>
              <Button
                variant={editData.isActive ? "default" : "destructive"}
                size="sm"
                onClick={() =>
                  setEditData({ ...editData, isActive: !editData.isActive })
                }
              >
                <Power className="mr-2 h-4 w-4" />
                {editData.isActive ? "Active" : "Inactive"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={editData.planId}
                onValueChange={(v) => setEditData({ ...editData, planId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <Select
                value={editData.status}
                onValueChange={(v) => setEditData({ ...editData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIALING">Trialing</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
