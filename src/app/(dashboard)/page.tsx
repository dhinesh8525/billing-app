/**
 * Dashboard Page
 *
 * Main dashboard with sales overview, stats, and quick access cards.
 * Vyapar-style layout with summary cards and charts.
 * MULTI-TENANT: All data is scoped to the current tenant.
 */

import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { requireTenantContext } from "@/lib/tenant"
import { BillingService, ProductService, PartyService } from "@/services"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
} from "lucide-react"
import Link from "next/link"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { AlertsWidget } from "@/components/dashboard/alerts-widget"
import { UsageWidget } from "@/components/dashboard/usage-widget"
import { PaymentDueWidget } from "@/components/dashboard/payment-due-widget"
import { BusinessInsights } from "@/components/dashboard/business-insights"

async function DashboardStats() {
  const { tenantId } = await requireTenantContext()

  const [stats, lowStock, receivables, _payables, stockValue, recentTransactions, monthlySales] =
    await Promise.all([
      BillingService.getDashboardStats(tenantId),
      ProductService.getLowStock(tenantId, 5),
      PartyService.getReceivables(tenantId, 5),
      PartyService.getPayables(tenantId, 5),
      ProductService.getStockValue(tenantId),
      BillingService.getRecentTransactions(tenantId, 5),
      BillingService.getMonthlySales(tenantId, 12),
    ])

  return (
    <>
      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Today&apos;s Sale
            </CardTitle>
            <TrendingUp className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.todaySales)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              {stats.todayTransactions} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total Sales (This Month) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              This Month Sale
            </CardTitle>
            {stats.salesGrowth !== 0 && (
              <Badge
                variant="secondary"
                className={
                  stats.salesGrowth > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {stats.salesGrowth > 0 ? "+" : ""}
                {stats.salesGrowth.toFixed(1)}%
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalSales)}
            </div>
            <div
              className={`flex items-center text-xs mt-1 ${
                stats.salesGrowth >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {stats.salesGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              vs last month
            </div>
          </CardContent>
        </Card>

        {/* You'll Receive */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              You&apos;ll Receive
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.receivables)}
            </div>
            <Link
              href="/parties?hasBalance=true&type=customer"
              className="text-xs text-slate-500 hover:text-primary"
            >
              View all receivables
            </Link>
          </CardContent>
        </Card>

        {/* You'll Pay */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              You&apos;ll Pay
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.payables)}
            </div>
            <Link
              href="/parties?hasBalance=true&type=supplier"
              className="text-xs text-slate-500 hover:text-primary"
            >
              View all payables
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart Row */}
      <div className="grid gap-4 lg:grid-cols-3 mt-6">
        {/* Sales Chart - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <SalesChart
              data={monthlySales}
              title="Sale"
              totalSales={stats.totalSales}
            />
          </CardContent>
        </Card>

        {/* Stock Inventory - Side panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stock Inventory</CardTitle>
              <Package className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Stock Value</span>
              <span className="text-lg font-semibold">
                {formatCurrency(stockValue)}
              </span>
            </div>

            {lowStock.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-amber-600 mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Low Stocks</span>
                </div>
                <ul className="space-y-2">
                  {lowStock.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600 truncate max-w-[150px]">
                        {item.name}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {item.stock} {item.unit}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/products?lowStock=true"
                  className="block mt-3 text-xs text-primary hover:underline"
                >
                  View all low stock items
                </Link>
              </div>
            )}

            {lowStock.length === 0 && (
              <p className="text-sm text-slate-500 pt-4 border-t">
                None of your stocks has low value
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Receivables, Recent Transactions, and Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {/* Receivables */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Receivables</CardTitle>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <CardDescription>Customers who owe you</CardDescription>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-sm text-slate-500">No pending receivables</p>
            ) : (
              <ul className="space-y-3">
                {receivables.map((party) => (
                  <li
                    key={party.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{party.name}</p>
                      <p className="text-xs text-slate-500">{party.phone}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(Number(party.currentBalance))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Wallet className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet</p>
            ) : (
              <ul className="space-y-3">
                {recentTransactions.map((txn) => (
                  <li
                    key={txn.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {txn.party?.name || txn.customerName || "Walk-in"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {txn.invoiceNumber} • {formatDate(txn.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        txn.type === "SALE"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {txn.type === "SALE" ? "+" : "-"}
                      {formatCurrency(Number(txn.total))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/invoices"
              className="block mt-4 text-xs text-primary hover:underline"
            >
              View all transactions
            </Link>
          </CardContent>
        </Card>

        {/* Payment Due Widget */}
        <PaymentDueWidget tenantId={tenantId} />

        {/* Business Insights */}
        <BusinessInsights tenantId={tenantId} />
      </div>

      {/* Fourth Row - Client-side Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <QuickActions />
        <AlertsWidget />
        <UsageWidget />
      </div>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-slate-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 w-full bg-slate-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-500">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {formatDate(new Date())}
        </Badge>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
