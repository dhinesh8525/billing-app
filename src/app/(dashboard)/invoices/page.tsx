/**
 * Invoices List Page
 *
 * Displays all invoices with filtering and search.
 */

import { Suspense } from "react"
import Link from "next/link"
import { BillingService } from "@/services"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface InvoicesPageProps {
  searchParams: Promise<{
    search?: string
    type?: string
    status?: string
    paymentStatus?: string
    page?: string
  }>
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>
    case "DRAFT":
      return <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
    case "CANCELLED":
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-700">Paid</Badge>
    case "partial":
      return <Badge className="bg-amber-100 text-amber-700">Partial</Badge>
    case "unpaid":
      return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

async function InvoicesTable({
  searchParams,
}: {
  searchParams: InvoicesPageProps["searchParams"]
}) {
  const params = await searchParams
  const result = await BillingService.list({
    search: params.search,
    type: params.type as "SALE" | "PURCHASE" | undefined,
    status: params.status as "COMPLETED" | "DRAFT" | "CANCELLED" | undefined,
    paymentStatus: params.paymentStatus as "paid" | "unpaid" | "partial" | undefined,
    page: parseInt(params.page || "1"),
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  if (result.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No invoices found</h3>
        <p className="text-slate-500 mt-1">
          {params.search
            ? `No invoices match "${params.search}"`
            : "Create your first invoice to get started."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/billing">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Party/Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {invoice.invoiceNumber}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {invoice.type === "SALE" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {invoice.type === "SALE" ? "Sale" : "Purchase"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {invoice.party?.name || invoice.customerName || (
                  <span className="text-slate-400">Walk-in</span>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm">{formatDate(invoice.invoiceDate)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(invoice.createdAt).split(",")[1]}
                  </p>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
              <TableCell>{getPaymentBadge(invoice.paymentStatus)}</TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-semibold ${
                    invoice.type === "SALE" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {invoice.type === "SALE" ? "+" : "-"}
                  {formatCurrency(Number(invoice.total))}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <p className="text-sm text-slate-600">
            Showing{" "}
            {(result.pagination.page - 1) * result.pagination.pageSize + 1} to{" "}
            {Math.min(
              result.pagination.page * result.pagination.pageSize,
              result.pagination.total
            )}{" "}
            of {result.pagination.total} invoices
          </p>
          <div className="flex gap-2">
            {result.pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/invoices?page=${result.pagination.page - 1}${
                    params.search ? `&search=${params.search}` : ""
                  }`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {result.pagination.page < result.pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/invoices?page=${result.pagination.page + 1}${
                    params.search ? `&search=${params.search}` : ""
                  }`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function InvoicesTableSkeleton() {
  return (
    <div className="animate-pulse">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Party/Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(7)].map((_, j) => (
                <TableCell key={j}>
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">View and manage all transactions</p>
        </div>
        <Button asChild>
          <Link href="/billing">
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <form className="flex-1 relative" action="/invoices">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                name="search"
                placeholder="Search by invoice number or customer..."
                className="pl-10"
                defaultValue={params.search}
              />
            </form>
            <div className="flex gap-2">
              <Select defaultValue={params.type || "all"}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SALE">Sales</SelectItem>
                  <SelectItem value="PURCHASE">Purchases</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue={params.paymentStatus || "all"}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<InvoicesTableSkeleton />}>
            <InvoicesTable searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
