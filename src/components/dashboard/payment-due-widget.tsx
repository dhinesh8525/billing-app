/**
 * Payment Due Widget Component
 *
 * Shows upcoming and overdue payments on the dashboard.
 */

import Link from "next/link"
import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
} from "lucide-react"

interface PaymentDueWidgetProps {
  tenantId: string
}

export async function PaymentDueWidget({ tenantId }: PaymentDueWidgetProps) {
  const today = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  // Get invoices with due dates
  const dueInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      paymentStatus: { in: ["unpaid", "partial"] },
      dueDate: { not: null, lte: sevenDaysFromNow },
    },
    include: {
      party: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  })

  // Calculate totals
  const overdue = dueInvoices.filter((inv) => inv.dueDate && inv.dueDate < today)
  const dueSoon = dueInvoices.filter((inv) => inv.dueDate && inv.dueDate >= today)

  const totalOverdue = overdue.reduce(
    (sum, inv) => sum + Number(inv.total) - Number(inv.amountPaid),
    0
  )
  const totalDueSoon = dueSoon.reduce(
    (sum, inv) => sum + Number(inv.total) - Number(inv.amountPaid),
    0
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Payment Due
          </CardTitle>
          {overdue.length > 0 && (
            <Badge variant="destructive" className="h-5">
              {overdue.length} overdue
            </Badge>
          )}
        </div>
        <CardDescription>Upcoming payment reminders</CardDescription>
      </CardHeader>
      <CardContent>
        {dueInvoices.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">All payments on track!</p>
            <p className="text-xs text-slate-400 mt-1">No upcoming due dates</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {totalOverdue > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">Overdue</p>
                  <p className="text-lg font-bold text-red-700">
                    {formatCurrency(totalOverdue)}
                  </p>
                </div>
              )}
              {totalDueSoon > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium">Due Soon</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(totalDueSoon)}
                  </p>
                </div>
              )}
            </div>

            {/* Invoice List */}
            <div className="space-y-2">
              {dueInvoices.slice(0, 4).map((invoice) => {
                const isOverdue = invoice.dueDate && invoice.dueDate < today
                const balance = Number(invoice.total) - Number(invoice.amountPaid)

                return (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {isOverdue ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {invoice.party?.name || invoice.customerName || "Walk-in"}
                        </p>
                        <p className="text-xs text-slate-500">
                          #{invoice.invoiceNumber} •{" "}
                          {invoice.dueDate?.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                        {formatCurrency(balance)}
                      </p>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px] h-4">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {dueInvoices.length > 4 && (
              <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                <Link href="/invoices?paymentStatus=unpaid">
                  View all ({dueInvoices.length})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
