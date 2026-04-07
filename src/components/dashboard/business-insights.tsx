/**
 * Business Insights Component
 *
 * Shows growth metrics and business trends.
 */

import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
  ShoppingCart,
} from "lucide-react"

interface BusinessInsightsProps {
  tenantId: string
}

interface Insight {
  label: string
  value: string
  change: number
  changeLabel: string
  icon: React.ElementType
}

export async function BusinessInsights({ tenantId }: BusinessInsightsProps) {
  const today = new Date()
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  // Get this month's data
  const [thisMonthSales, lastMonthSales, thisMonthInvoices, lastMonthInvoices, newCustomers, totalCustomers] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: {
          tenantId,
          type: "SALE",
          status: "COMPLETED",
          invoiceDate: { gte: thisMonthStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          tenantId,
          type: "SALE",
          status: "COMPLETED",
          invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          status: "COMPLETED",
          invoiceDate: { gte: thisMonthStart },
        },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          status: "COMPLETED",
          invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.party.count({
        where: {
          tenantId,
          type: "CUSTOMER",
          createdAt: { gte: thisMonthStart },
        },
      }),
      prisma.party.count({
        where: {
          tenantId,
          type: "CUSTOMER",
        },
      }),
    ])

  const thisMonthTotal = Number(thisMonthSales._sum.total || 0)
  const lastMonthTotal = Number(lastMonthSales._sum.total || 0)

  // Calculate growth percentages
  const salesGrowth = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : thisMonthTotal > 0 ? 100 : 0

  const invoiceGrowth = lastMonthInvoices > 0
    ? ((thisMonthInvoices - lastMonthInvoices) / lastMonthInvoices) * 100
    : thisMonthInvoices > 0 ? 100 : 0

  // Average order value
  const avgOrderValue = thisMonthInvoices > 0 ? thisMonthTotal / thisMonthInvoices : 0
  const lastMonthAvg = lastMonthInvoices > 0 ? lastMonthTotal / lastMonthInvoices : 0
  const avgGrowth = lastMonthAvg > 0
    ? ((avgOrderValue - lastMonthAvg) / lastMonthAvg) * 100
    : avgOrderValue > 0 ? 100 : 0

  const insights: Insight[] = [
    {
      label: "Sales Growth",
      value: formatCurrency(thisMonthTotal),
      change: salesGrowth,
      changeLabel: "vs last month",
      icon: TrendingUp,
    },
    {
      label: "Transactions",
      value: thisMonthInvoices.toString(),
      change: invoiceGrowth,
      changeLabel: "vs last month",
      icon: ShoppingCart,
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(avgOrderValue),
      change: avgGrowth,
      changeLabel: "vs last month",
      icon: BarChart3,
    },
    {
      label: "New Customers",
      value: newCustomers.toString(),
      change: 0,
      changeLabel: `of ${totalCustomers} total`,
      icon: Users,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Business Insights
        </CardTitle>
        <CardDescription>This month&apos;s performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {insights.map((insight) => (
            <div key={insight.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <insight.icon className="h-3.5 w-3.5" />
                {insight.label}
              </div>
              <p className="text-lg font-bold">{insight.value}</p>
              <div className="flex items-center gap-1 text-xs">
                {insight.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : insight.change < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-slate-400" />
                )}
                <span
                  className={
                    insight.change > 0
                      ? "text-emerald-600"
                      : insight.change < 0
                      ? "text-red-600"
                      : "text-slate-500"
                  }
                >
                  {insight.change !== 0
                    ? `${insight.change > 0 ? "+" : ""}${insight.change.toFixed(1)}%`
                    : insight.changeLabel}
                </span>
                {insight.change !== 0 && (
                  <span className="text-slate-400">{insight.changeLabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
