"use client"

/**
 * Admin Dashboard Page
 *
 * Platform overview with key metrics, recent activity.
 * Only accessible by system admins (User.role = ADMIN).
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { toast } from "sonner"
import {
  Building2,
  Users,
  TrendingUp,
  IndianRupee,
  ArrowRight,
  Loader2,
  ShieldAlert,
} from "lucide-react"

interface DashboardData {
  stats: {
    totalTenants: number
    activeTenants: number
    totalUsers: number
    totalRevenue: number
    mrr: number
    recentSignups: number
    recentRevenue: number
    subscriptionsByPlan: { planName: string; count: number }[]
    subscriptionsByStatus: { status: string; count: number }[]
  }
  recentTenants: {
    id: string
    name: string
    slug: string
    createdAt: string
    subscription: { planName: string; status: string } | null
    stats: { members: number; invoices: number }
  }[]
  recentPayments: {
    id: string
    tenantName: string
    amount: number
    status: string
    createdAt: string
  }[]
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    loadDashboard()
  }, [session, status, router])

  async function loadDashboard() {
    try {
      const response = await fetch("/api/admin/dashboard")
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to load dashboard")
    } finally {
      setIsLoading(false)
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
        <p className="text-slate-500">You need admin privileges to access this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.totalTenants}</p>
                    <p className="text-sm text-slate-500">Total Workspaces</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {data.stats.activeTenants} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.totalUsers}</p>
                    <p className="text-sm text-slate-500">Total Users</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  +{data.stats.recentSignups} last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(data.stats.mrr)}</p>
                    <p className="text-sm text-slate-500">Monthly Recurring</p>
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
                    <p className="text-2xl font-bold">
                      {formatCurrency(data.stats.totalRevenue)}
                    </p>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {formatCurrency(data.stats.recentRevenue)} last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subscriptions by Plan & Status */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.stats.subscriptionsByPlan.map((item) => (
                    <div
                      key={item.planName}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{item.planName}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscriptions by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.stats.subscriptionsByStatus.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between"
                    >
                      <Badge className={statusColors[item.status] || "bg-slate-100"}>
                        {item.status}
                      </Badge>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tenants & Payments */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Workspaces</CardTitle>
                  <CardDescription>Newly registered workspaces</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/tenants">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <Link
                            href={`/admin/tenants/${tenant.id}`}
                            className="font-medium hover:underline"
                          >
                            {tenant.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {tenant.subscription ? (
                            <Badge
                              variant="outline"
                              className={statusColors[tenant.subscription.status]}
                            >
                              {tenant.subscription.planName}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDate(tenant.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Payments</CardTitle>
                  <CardDescription>Latest successful payments</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/payments">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentPayments.length > 0 ? (
                      data.recentPayments.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.tenantName}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(payment.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-400">
                          No payments yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
