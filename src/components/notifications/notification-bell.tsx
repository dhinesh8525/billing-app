"use client"

/**
 * Notification Bell Component
 *
 * Shows notification count badge and dropdown with recent notifications.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
      return <Package className="h-4 w-4 text-amber-500" />
    case "PAYMENT_DUE":
    case "PAYMENT_OVERDUE":
      return <CreditCard className="h-4 w-4 text-red-500" />
    case "INVOICE_CREATED":
    case "INVOICE_PAID":
      return <Receipt className="h-4 w-4 text-blue-500" />
    case "NEW_MEMBER":
    case "MEMBER_LEFT":
      return <Users className="h-4 w-4 text-purple-500" />
    case "SUBSCRIPTION_EXPIRING":
    case "SUBSCRIPTION_EXPIRED":
    case "USAGE_LIMIT_WARNING":
    case "USAGE_LIMIT_REACHED":
      return <Zap className="h-4 w-4 text-orange-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-slate-500" />
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

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const { status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (status !== "authenticated") return

    fetchUnreadCount()

    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [status])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && status === "authenticated") {
      fetchNotifications()
    }
  }, [isOpen, status])

  async function fetchUnreadCount() {
    try {
      const response = await fetch("/api/notifications/count")
      const result = await response.json()
      if (result.success) {
        setUnreadCount(result.data.count)
      }
    } catch {
      // Silently fail
    }
  }

  async function fetchNotifications() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications?limit=10")
      const result = await response.json()
      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
      }
    } catch {
      // Silently fail
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
      // Silently fail
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }

  if (status !== "authenticated") {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification)

                return (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-slate-50 transition-colors ${
                      !notification.isRead ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          <div className="flex gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark read
                              </Button>
                            )}
                            {link && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                asChild
                                onClick={() => {
                                  if (!notification.isRead) {
                                    markAsRead(notification.id)
                                  }
                                  setIsOpen(false)
                                }}
                              >
                                <Link href={link}>
                                  View
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
