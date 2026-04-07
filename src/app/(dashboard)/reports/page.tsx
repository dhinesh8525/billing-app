/**
 * Reports Page
 *
 * Centralized hub for all exports and reports.
 */

import { Suspense } from "react"
import Link from "next/link"
import { requireTenantContext } from "@/lib/tenant"
import { BillingService } from "@/services"
import { formatCurrency } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Package,
  Users,
  Receipt,
  TrendingUp,
  Calculator,
  Loader2,
} from "lucide-react"
import { ExportButton } from "@/components/export-button"

async function ReportSummary() {
  const { tenantId } = await requireTenantContext()

  // Get some summary stats
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const invoices = await BillingService.list(tenantId, {
    startDate: startOfMonth,
    endDate: today,
    type: "SALE",
    status: "COMPLETED",
    page: 1,
    pageSize: 1000,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  const totalSales = invoices.data.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalTax = invoices.data.reduce((sum, inv) => sum + Number(inv.taxAmount), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Month Sales</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">GST Collected</p>
              <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
            </div>
            <Calculator className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Invoices</p>
              <p className="text-2xl font-bold">{invoices.pagination.total}</p>
            </div>
            <Receipt className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
          <p className="text-slate-500">Download reports and export your data</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/reports/analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics Dashboard
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<ReportSummarySkeleton />}>
        <ReportSummary />
      </Suspense>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sales Reports
            </CardTitle>
            <CardDescription>
              Export invoices and sales data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">All Invoices</p>
                <p className="text-sm text-slate-500">Complete invoice listing with all details</p>
              </div>
              <ExportButton type="invoices" showDateFilter />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Invoice Line Items</p>
                <p className="text-sm text-slate-500">Individual items from all invoices</p>
              </div>
              <ExportButton type="invoice-items" showDateFilter />
            </div>
          </CardContent>
        </Card>

        {/* Tax Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              GST Reports
            </CardTitle>
            <CardDescription>
              Tax reports for compliance and filing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">GST Summary</p>
                <p className="text-sm text-slate-500">Invoice-wise GST breakdown (CGST, SGST, IGST)</p>
              </div>
              <ExportButton type="gst" showDateFilter />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">HSN Summary</p>
                <p className="text-sm text-slate-500">HSN code-wise tax summary for GSTR-1</p>
              </div>
              <ExportButton type="hsn" showDateFilter />
            </div>
          </CardContent>
        </Card>

        {/* Products Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory
            </CardTitle>
            <CardDescription>
              Export products and stock data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Products List</p>
                <p className="text-sm text-slate-500">All products with stock and pricing</p>
              </div>
              <ExportButton type="products" />
            </div>
          </CardContent>
        </Card>

        {/* Parties Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parties
            </CardTitle>
            <CardDescription>
              Export customers and suppliers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">All Parties</p>
                <p className="text-sm text-slate-500">Customers and suppliers with balances</p>
              </div>
              <ExportButton type="parties" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Customers Only</p>
                <p className="text-sm text-slate-500">Customer list with contact details</p>
              </div>
              <ExportButton type="parties" partyType="CUSTOMER" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Suppliers Only</p>
                <p className="text-sm text-slate-500">Supplier list with contact details</p>
              </div>
              <ExportButton type="parties" partyType="SUPPLIER" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Other Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/reports/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Sales Analytics
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings/activity">
                <FileText className="h-4 w-4 mr-2" />
                Activity Log
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
