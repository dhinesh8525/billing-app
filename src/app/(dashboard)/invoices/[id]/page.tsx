/**
 * Invoice Detail Page
 *
 * Displays full invoice details with print functionality.
 * MULTI-TENANT: All data is scoped to the current tenant.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { requireTenantContext } from "@/lib/tenant"
import { BillingService, SettingsService } from "@/services"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  TableFooter,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Phone,
  MapPin,
} from "lucide-react"
import { InvoiceActions } from "@/components/invoices/invoice-actions"
import { InvoicePdfActions } from "@/components/invoices/invoice-pdf-actions"

interface InvoiceDetailPageProps {
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

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { tenantId } = await requireTenantContext()
  const { id } = await params

  let invoice
  try {
    invoice = await BillingService.getById(tenantId, id)
  } catch {
    notFound()
  }

  const businessSettings = await SettingsService.get(tenantId, "business")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              {getStatusBadge(invoice.status)}
              {getPaymentBadge(invoice.paymentStatus)}
            </div>
            <p className="text-slate-500">
              {invoice.type === "SALE" ? "Sale Invoice" : "Purchase Invoice"} •{" "}
              {formatDate(invoice.invoiceDate)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <InvoicePdfActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            customerEmail={invoice.customerEmail || invoice.party?.email}
          />
          {invoice.status !== "CANCELLED" && (
            <InvoiceActions invoice={invoice} />
          )}
        </div>
      </div>

      {/* Invoice Content */}
      <Card className="overflow-hidden">
        {/* Invoice Header */}
        <CardHeader className="bg-slate-50 print:bg-white">
          <div className="flex justify-between">
            {/* Business Info */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {businessSettings.businessName}
              </h2>
              {businessSettings.gstin && (
                <p className="text-sm text-slate-600">
                  GSTIN: {businessSettings.gstin}
                </p>
              )}
              {businessSettings.address && (
                <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {businessSettings.address}
                </p>
              )}
              {businessSettings.phone && (
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {businessSettings.phone}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="text-right">
              <h3 className="text-2xl font-bold text-primary">
                {invoice.type === "SALE" ? "TAX INVOICE" : "PURCHASE INVOICE"}
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Invoice #: <span className="font-medium">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-sm text-slate-600">
                Date: <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-slate-600">
                  Due Date: <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Bill To */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-500 mb-2">BILL TO</h4>
            <div className="p-4 bg-slate-50 rounded-lg">
              {invoice.party ? (
                <>
                  <p className="font-medium">{invoice.party.name}</p>
                  {invoice.party.gstin && (
                    <p className="text-sm text-slate-600">
                      GSTIN: {invoice.party.gstin}
                    </p>
                  )}
                  {invoice.party.phone && (
                    <p className="text-sm text-slate-600">
                      Phone: {invoice.party.phone}
                    </p>
                  )}
                  {invoice.party.billingAddress && (
                    <p className="text-sm text-slate-600">
                      {invoice.party.billingAddress}
                    </p>
                  )}
                </>
              ) : invoice.customerName ? (
                <>
                  <p className="font-medium">{invoice.customerName}</p>
                  {invoice.customerPhone && (
                    <p className="text-sm text-slate-600">
                      Phone: {invoice.customerPhone}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-500">Walk-in Customer</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-slate-500">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.productSku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {item.hsn || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.taxRate)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.lineTotal))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow>
                <TableCell colSpan={6} className="text-right">
                  Subtotal
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(invoice.subtotal))}
                </TableCell>
              </TableRow>

              {Number(invoice.discountAmount) > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-right text-green-600">
                    Discount ({Number(invoice.discountPercent)}%)
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    -{formatCurrency(Number(invoice.discountAmount))}
                  </TableCell>
                </TableRow>
              )}

              {Number(invoice.cgst) > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-right">
                    CGST ({Number(invoice.taxRate) / 2}%)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(invoice.cgst))}
                  </TableCell>
                </TableRow>
              )}

              {Number(invoice.sgst) > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-right">
                    SGST ({Number(invoice.taxRate) / 2}%)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(invoice.sgst))}
                  </TableCell>
                </TableRow>
              )}

              {Number(invoice.igst) > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-right">
                    IGST ({Number(invoice.taxRate)}%)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(invoice.igst))}
                  </TableCell>
                </TableRow>
              )}

              {Number(invoice.roundOff) !== 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-right text-slate-500">
                    Round Off
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {Number(invoice.roundOff) > 0 ? "+" : ""}
                    {formatCurrency(Number(invoice.roundOff))}
                  </TableCell>
                </TableRow>
              )}

              <TableRow className="bg-slate-50">
                <TableCell colSpan={6} className="text-right text-lg font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right text-lg font-bold text-primary">
                  {formatCurrency(Number(invoice.total))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          {/* Payment Info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500">Payment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getPaymentBadge(invoice.paymentStatus)}
                  {invoice.paymentMode && (
                    <span className="text-sm text-slate-600">
                      via {invoice.paymentMode}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Amount Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(Number(invoice.amountPaid))}
                </p>
                {Number(invoice.total) - Number(invoice.amountPaid) > 0 && (
                  <p className="text-sm text-red-600">
                    Balance:{" "}
                    {formatCurrency(
                      Number(invoice.total) - Number(invoice.amountPaid)
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-500 mb-2">Notes</p>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <Separator className="my-6" />

          <div className="text-center text-sm text-slate-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">
              Created by {invoice.createdBy.name} on{" "}
              {formatDate(invoice.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
