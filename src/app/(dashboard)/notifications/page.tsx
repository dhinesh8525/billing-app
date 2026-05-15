"use client"

/**
 * Notifications Page
 *
 * Full list of all notifications with filtering and actions.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Bell,
  Package,
  Receipt,
  AlertTriangle,
  CreditCard,
  Users,
  Zap,
  Check,
  Loader2,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  priority: string
  isRead: boolean
  createdAt: string
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "LOW_STOCK":
    case "OUT_OF_STOCK":
      return <Package className="h-5 w-5 text-amber-500" />
    case "PAYMENT_DUE":
    case "PAYMENT_OVERDUE":
      return <CreditCard className="h-5 w-5 text-red-500" />
    case "INVOICE_CREATED":
    case "INVOICE_PAID":
      return <Receipt className="h-5 w-5 text-blue-500" />
    case "NEW_MEMBER":
    case "MEMBER_LEFT":
      return <Users className="h-5 w-5 text-purple-500" />
    case "SUBSCRIPTION_EXPIRING":
    case "SUBSCRIPTION_EXPIRED":
    case "USAGE_LIMIT_WARNING":
    case "USAGE_LIMIT_REACHED":
      return <Zap className="h-5 w-5 text-orange-500" />
    default:
      return <AlertTriangle className="h-5 w-5 text-slate-500" />
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return <Badge variant="destructive">Urgent</Badge>
    case "high":
      return <Badge className="bg-amber-100 text-amber-700">High</Badge>
    case "normal":
      return null
    case "low":
      return <Badge variant="secondary">Low</Badge>
    default:
      return null
  }
}

function getNotificationLink(notification: Notification): string | null {
  const data = notification.data as Record<string, unknown> | null
  if (!data) return null

  switch (notification.type) {
    case "LOW_STOCK":
    case "OUT_OF_STOCK":
      return data.productId ? `/products/${data.productId}/edit` : "/products?lowStock=true"
    case "PAYMENT_DUE":
    case "PAYMENT_OVERDUE":
    case "INVOICE_CREATED":
    case "INVOICE_PAID":
      return data.invoiceId ? `/invoices/${data.invoiceId}` : "/invoices"
    case "SUBSCRIPTION_EXPIRING":
    case "SUBSCRIPTION_EXPIRED":
    case "USAGE_LIMIT_WARNING":
    case "USAGE_LIMIT_REACHED":
      return "/subscription"
    case "NEW_MEMBER":
    case "MEMBER_LEFT":
      return "/settings/team"
    default:
      return null
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function NotificationsPage() {
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filter])

  async function fetchNotifications() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "50",
        ...(filter === "unread" ? { unreadOnly: "true" } : {}),
      })
      const response = await fetch(`/api/notifications?${params}`)
      const result = await response.json()
      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
        setTotal(result.data.total)
      }
    } catch {
      toast.error("Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      })
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      toast.error("Failed to mark as read")
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setTotal((prev) => prev - 1)
      toast.success("Notification deleted")
    } catch {
      toast.error("Failed to delete notification")
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList variant="card">
          <TabsTrigger value="all">
            All ({total})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {filter === "all" ? "All Notifications" : "Unread Notifications"}
              </CardTitle>
              <CardDescription>
                {filter === "all"
                  ? "Your recent notifications and alerts"
                  : "Notifications you haven't read yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">
                    {filter === "unread" ? "No unread notifications" : "No notifications"}
                  </h3>
                  <p className="text-slate-500 mt-1">
                    {filter === "unread"
                      ? "You're all caught up!"
                      : "You'll see notifications here when there are alerts or updates."}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const link = getNotificationLink(notification)

                    return (
                      <div
                        key={notification.id}
                        className={`py-4 first:pt-0 last:pb-0 ${
                          !notification.isRead ? "bg-blue-50/30 -mx-4 px-4" : ""
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {notification.title}
                                </h4>
                                {getPriorityBadge(notification.priority)}
                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                                )}
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {formatDate(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              {!notification.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                              {link && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markAsRead(notification.id)
                                    }
                                  }}
                                >
                                  <Link href={link}>
                                    View
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
