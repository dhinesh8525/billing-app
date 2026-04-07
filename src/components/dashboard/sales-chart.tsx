"use client"

/**
 * Sales Chart Component
 *
 * Displays sales data in an area chart format similar to Vyapar.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface SalesChartProps {
  data: Array<{
    month: string
    sales: number
  }>
  title?: string
  totalSales?: number
}

export function SalesChart({ data, title = "Sale", totalSales }: SalesChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-sm text-emerald-600 font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  // Format Y-axis to show in lakhs/thousands
  const formatYAxis = (value: number) => {
    if (value >= 100000) {
      return `${(value / 100000).toFixed(1)}L`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {totalSales !== undefined && (
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalSales)}
            </p>
          )}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#salesGradient)"
              dot={false}
              activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-500 text-center mt-2">
        Report: {data.length > 0 ? `${data[0].month} to ${data[data.length - 1].month}` : "No data"}
      </p>
    </div>
  )
}
