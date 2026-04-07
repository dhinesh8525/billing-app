"use client"

/**
 * Activity Log Page
 *
 * View audit logs for the current workspace.
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Loader2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  CreditCard,
  Settings,
  Send,
} from "lucide-react"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <Plus className="h-4 w-4 text-green-500" />,
  UPDATE: <Edit className="h-4 w-4 text-blue-500" />,
  DELETE: <Trash2 className="h-4 w-4 text-red-500" />,
  LOGIN: <LogIn className="h-4 w-4 text-purple-500" />,
  LOGOUT: <LogOut className="h-4 w-4 text-slate-500" />,
  INVITE: <Send className="h-4 w-4 text-amber-500" />,
  JOIN: <UserPlus className="h-4 w-4 text-green-500" />,
  LEAVE: <UserMinus className="h-4 w-4 text-red-500" />,
  SUBSCRIBE: <CreditCard className="h-4 w-4 text-green-500" />,
  CANCEL: <CreditCard className="h-4 w-4 text-red-500" />,
  SETTING_CHANGE: <Settings className="h-4 w-4 text-slate-500" />,
}

const actionLabels: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Logged in",
  LOGOUT: "Logged out",
  INVITE: "Invited",
  JOIN: "Joined",
  LEAVE: "Left",
  SUBSCRIBE: "Subscribed",
  CANCEL: "Cancelled",
  PAYMENT: "Payment",
  SETTING_CHANGE: "Changed setting",
  TRANSFER: "Transferred",
  EXPORT: "Exported",
}

const entityLabels: Record<string, string> = {
  USER: "User",
  TENANT: "Workspace",
  PRODUCT: "Product",
  INVOICE: "Invoice",
  PARTY: "Party",
  CATEGORY: "Category",
  SUBSCRIPTION: "Subscription",
  PAYMENT: "Payment",
  MEMBER: "Team Member",
  INVITATION: "Invitation",
  SETTINGS: "Settings",
  PLAN: "Plan",
}

export default function ActivityLogPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })

  const [actionFilter, setActionFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")

  useEffect(() => {
    if (status === "authenticated") {
      loadLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pagination.page, actionFilter, entityFilter])

  async function loadLogs() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (entityFilter !== "all") params.set("entityType", entityFilter)

      const response = await fetch(`/api/audit-logs?${params}`)
      const result = await response.json()

      if (result.success) {
        setLogs(result.data)
        setPagination(result.pagination)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to load activity logs")
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getDescription(log: AuditLog): string {
    const action = actionLabels[log.action] || log.action
    const entity = entityLabels[log.entityType] || log.entityType

    const metadata = log.metadata as Record<string, string> | null

    if (metadata?.name) {
      return `${action} ${entity.toLowerCase()} "${metadata.name}"`
    }

    if (metadata?.invoiceNumber) {
      return `${action} ${entity.toLowerCase()} #${metadata.invoiceNumber}`
    }

    if (metadata?.email) {
      return `${action} ${metadata.email}`
    }

    return `${action} ${entity.toLowerCase()}`
  }

  // Permission check
  const memberRole = session?.user?.tenantRole
  const canViewLogs = memberRole && ["OWNER", "ADMIN"].includes(memberRole)

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!canViewLogs) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Activity className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-slate-500">
          Only workspace owners and admins can view activity logs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-slate-500">Track actions and changes in your workspace</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="INVITE">Invite</SelectItem>
                <SelectItem value="JOIN">Join</SelectItem>
                <SelectItem value="LEAVE">Leave</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={entityFilter}
              onValueChange={(value) => {
                setEntityFilter(value)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INVOICE">Invoices</SelectItem>
                <SelectItem value="PRODUCT">Products</SelectItem>
                <SelectItem value="PARTY">Parties</SelectItem>
                <SelectItem value="MEMBER">Team Members</SelectItem>
                <SelectItem value="SETTINGS">Settings</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actionIcons[log.action] || (
                        <Activity className="h-4 w-4 text-slate-400" />
                      )}
                      <span>{actionLabels[log.action] || log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {entityLabels[log.entityType] || log.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {getDescription(log)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {log.ipAddress || "-"}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    No activity logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
