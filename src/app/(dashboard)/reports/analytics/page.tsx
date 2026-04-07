"use client"

/**
 * Analytics Dashboard Page
 *
 * Business analytics and insights for tenants.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Loader2,
  TrendingUp,
  IndianRupee,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface SalesAnalytics {
  totalRevenue: number
  totalInvoices: number
  averageOrderValue: number
  topProducts: { productName: string; quantity: number; revenue: number }[]
  topCustomers: { name: string; invoiceCount: number; totalSpent: number }[]
  paymentMethods: { method: string; count: number; amount: number }[]
}

interface GrowthAnalytics {
  newCustomers: number
  repeatCustomers: number
  customerRetentionRate: number
  invoiceGrowth: number
  revenueGrowth: number
  monthlyTrend: { month: string; revenue: number; invoices: number }[]
}

interface UsageSummary {
  invoices: { current: number; limit: number; percentage: number }
  products: { current: number; limit: number; percentage: number }
  users: { current: number; limit: number; percentage: number }
}

export default function AnalyticsPage() {
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState("month")

  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null)
  const [growthData, setGrowthData] = useState<GrowthAnalytics | null>(null)
  const [usageData, setUsageData] = useState<UsageSummary | null>(null)

  useEffect(() => {
    if (status === "authenticated") {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, period])

  async function loadAnalytics() {
    setIsLoading(true)
    try {
      const [salesRes, growthRes, usageRes] = await Promise.all([
        fetch(`/api/analytics?type=sales&period=${period}`),
        fetch(`/api/analytics?type=growth&period=${period}`),
        fetch(`/api/analytics?type=usage`),
      ])

      const [salesResult, growthResult, usageResult] = await Promise.all([
        salesRes.json(),
        growthRes.json(),
        usageRes.json(),
      ])

      if (salesResult.success) setSalesData(salesResult.data)
      if (growthResult.success) setGrowthData(growthResult.data)
      if (usageResult.success) setUsageData(usageResult.data)
    } catch {
      toast.error("Failed to load analytics")
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

  if (status === "loading" || isLoading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500">Business insights and performance metrics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="quarter">Last 90 days</SelectItem>
            <SelectItem value="year">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      {salesData && growthData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesData.totalRevenue)}
                  </p>
                  <p className="text-sm text-slate-500">Total Revenue</p>
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                {growthData.revenueGrowth >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">
                      +{growthData.revenueGrowth.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">
                      {growthData.revenueGrowth.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-slate-400 ml-1">vs previous</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{salesData.totalInvoices}</p>
                  <p className="text-sm text-slate-500">Total Orders</p>
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                {growthData.invoiceGrowth >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">
                      +{growthData.invoiceGrowth.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">
                      {growthData.invoiceGrowth.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-slate-400 ml-1">vs previous</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(salesData.averageOrderValue)}
                  </p>
                  <p className="text-sm text-slate-500">Avg Order Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{growthData.newCustomers}</p>
                  <p className="text-sm text-slate-500">New Customers</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {growthData.repeatCustomers} repeat customers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage & Limits */}
      {usageData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage & Limits</CardTitle>
            <CardDescription>Your current plan usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Monthly Invoices</span>
                  <span className="font-medium">
                    {usageData.invoices.current} / {usageData.invoices.limit}
                  </span>
                </div>
                <Progress
                  value={usageData.invoices.percentage}
                  className={
                    usageData.invoices.percentage >= 90
                      ? "[&>div]:bg-red-500"
                      : usageData.invoices.percentage >= 75
                      ? "[&>div]:bg-amber-500"
                      : ""
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Products</span>
                  <span className="font-medium">
                    {usageData.products.current} / {usageData.products.limit}
                  </span>
                </div>
                <Progress
                  value={usageData.products.percentage}
                  className={
                    usageData.products.percentage >= 90
                      ? "[&>div]:bg-red-500"
                      : usageData.products.percentage >= 75
                      ? "[&>div]:bg-amber-500"
                      : ""
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Team Members</span>
                  <span className="font-medium">
                    {usageData.users.current} / {usageData.users.limit}
                  </span>
                </div>
                <Progress
                  value={usageData.users.percentage}
                  className={
                    usageData.users.percentage >= 90
                      ? "[&>div]:bg-red-500"
                      : usageData.users.percentage >= 75
                      ? "[&>div]:bg-amber-500"
                      : ""
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        {salesData && salesData.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                Top Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.topProducts.slice(0, 5).map((product, idx) => (
                  <div key={product.productName} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-400 w-6">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.productName}</p>
                      <p className="text-sm text-slate-500">
                        {product.quantity} sold
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Customers */}
        {salesData && salesData.topCustomers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.topCustomers.slice(0, 5).map((customer, idx) => (
                  <div key={customer.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-400 w-6">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-slate-500">
                        {customer.invoiceCount} orders
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Methods */}
      {salesData && salesData.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {salesData.paymentMethods.map((method) => (
                <div
                  key={method.method}
                  className="p-4 rounded-lg bg-slate-50 text-center"
                >
                  <p className="text-2xl font-bold">{method.count}</p>
                  <p className="text-sm text-slate-500">{method.method}</p>
                  <p className="text-sm font-medium mt-1">
                    {formatCurrency(method.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {growthData && growthData.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {growthData.monthlyTrend.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-20">{item.month}</span>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (item.revenue /
                              Math.max(
                                ...growthData.monthlyTrend.map((t) => t.revenue)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-28 text-right">
                    {formatCurrency(item.revenue)}
                  </span>
                  <Badge variant="secondary" className="w-16 justify-center">
                    {item.invoices}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
