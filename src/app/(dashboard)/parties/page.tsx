/**
 * Parties List Page
 *
 * Displays all customers and suppliers with balances.
 */

import { Suspense } from "react"
import Link from "next/link"
import { PartyService } from "@/services"
import { formatCurrency } from "@/lib/utils"
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
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface PartiesPageProps {
  searchParams: Promise<{
    search?: string
    type?: string
    hasBalance?: string
    page?: string
  }>
}

async function PartiesTable({
  searchParams,
}: {
  searchParams: PartiesPageProps["searchParams"]
}) {
  const params = await searchParams
  const result = await PartyService.list({
    search: params.search,
    type: params.type as "customer" | "supplier" | "both" | undefined,
    hasBalance: params.hasBalance === "true",
    page: parseInt(params.page || "1"),
    pageSize: 20,
    sortBy: "name",
    sortOrder: "asc",
  })

  if (result.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No parties found</h3>
        <p className="text-slate-500 mt-1">
          {params.search
            ? `No parties match "${params.search}"`
            : "Add your first customer or supplier to get started."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/parties/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Party
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
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>GSTIN</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((party) => {
            const balance = Number(party.currentBalance)
            const isReceivable = balance > 0

            return (
              <TableRow key={party.id}>
                <TableCell>
                  <Link
                    href={`/parties/${party.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {party.name}
                  </Link>
                </TableCell>
                <TableCell>{party.phone || "-"}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  {party.gstin ? (
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      {party.gstin}
                    </code>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {balance !== 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      {isReceivable ? (
                        <>
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-green-600">
                            {formatCurrency(balance)}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                          <span className="font-semibold text-red-600">
                            {formatCurrency(Math.abs(balance))}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
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
            of {result.pagination.total} parties
          </p>
          <div className="flex gap-2">
            {result.pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/parties?page=${result.pagination.page - 1}${
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
                  href={`/parties?page=${result.pagination.page + 1}${
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

function PartiesTableSkeleton() {
  return (
    <div className="animate-pulse">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>GSTIN</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(5)].map((_, j) => (
                <TableCell key={j}>
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function PartiesPage({
  searchParams,
}: PartiesPageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parties</h1>
          <p className="text-slate-500">
            Manage customers and suppliers
          </p>
        </div>
        <Button asChild>
          <Link href="/parties/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <form className="flex-1 relative" action="/parties">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                name="search"
                placeholder="Search by name or phone..."
                className="pl-10"
                defaultValue={params.search}
              />
            </form>
            <div className="flex gap-2">
              <Select defaultValue={params.type || "all"}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={params.hasBalance === "true" ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={
                    params.hasBalance === "true"
                      ? "/parties"
                      : "/parties?hasBalance=true"
                  }
                >
                  With Balance
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<PartiesTableSkeleton />}>
            <PartiesTable searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
