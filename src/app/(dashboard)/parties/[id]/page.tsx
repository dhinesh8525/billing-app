/**
 * Party Detail Page
 *
 * Displays party information, ledger, and allows editing.
 * MULTI-TENANT: All data is scoped to the current tenant.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { requireTenantContext } from "@/lib/tenant"
import { PartyService } from "@/services"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface PartyDetailPageProps {
  params: Promise<{ id: string }>
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

export default async function PartyDetailPage({ params }: PartyDetailPageProps) {
  const { tenantId } = await requireTenantContext()
  const { id } = await params

  let party
  let ledger
  try {
    party = await PartyService.getById(tenantId, id)
    ledger = await PartyService.getLedger(tenantId, id, 1, 20)
  } catch {
    notFound()
  }

  const balance = Number(party.currentBalance)
  const isReceivable = balance > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parties">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{party.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className={
                  party.type === "customer"
                    ? "bg-blue-100 text-blue-700"
                    : party.type === "supplier"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-700"
                }
              >
                {party.type}
              </Badge>
              {party._count?.invoices > 0 && (
                <span className="text-sm text-slate-500">
                  {party._count.invoices} transactions
                </span>
              )}
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/parties/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {party.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{party.phone}</span>
              </div>
            )}
            {party.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{party.email}</span>
              </div>
            )}
            {party.billingAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <span className="text-slate-600">{party.billingAddress}</span>
              </div>
            )}
            {!party.phone && !party.email && !party.billingAddress && (
              <p className="text-sm text-slate-400">No contact details</p>
            )}
          </CardContent>
        </Card>

        {/* Tax Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {party.gstin && (
              <div className="text-sm">
                <span className="text-slate-500">GSTIN:</span>{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                  {party.gstin}
                </code>
              </div>
            )}
            {party.pan && (
              <div className="text-sm">
                <span className="text-slate-500">PAN:</span>{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                  {party.pan}
                </code>
              </div>
            )}
            {!party.gstin && !party.pan && (
              <p className="text-sm text-slate-400">No tax details</p>
            )}
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {balance !== 0 ? (
              <div className="flex items-center gap-2">
                {isReceivable ? (
                  <>
                    <ArrowDownRight className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(balance)}
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(Math.abs(balance))}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-400">-</span>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {isReceivable
                ? "They owe you"
                : balance < 0
                ? "You owe them"
                : "No outstanding balance"}
            </p>
            {party.creditLimit && (
              <p className="text-xs text-slate-500 mt-1">
                Credit limit: {formatCurrency(Number(party.creditLimit))}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent invoices with this party</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No transactions</h3>
              <p className="text-slate-500 mt-1">
                No invoices have been created for this party yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/billing">Create Invoice</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.invoices.map((invoice) => {
                  const total = Number(invoice.total)
                  const paid = Number(invoice.amountPaid)
                  const invoiceBalance = total - paid

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
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
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoiceBalance > 0 ? (
                          <span className="font-medium text-amber-600">
                            {formatCurrency(invoiceBalance)}
                          </span>
                        ) : (
                          <span className="text-green-600">Settled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
