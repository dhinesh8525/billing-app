"use client"

/**
 * Alerts Widget Component
 *
 * Shows recent alerts/notifications on the dashboard.
 */

import { useState, useEffect } from "react"
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
import {
  Bell,
  Package,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react"

interface Alert {
  id: string
  type: string
  title: string
  message: string
  priority: string
  createdAt: string
}

function getAlertIcon(type: string) {
  switch (type) {
    case "LOW_STOCK":
    case "OUT_OF_STOCK":
      return <Package className="h-4 w-4 text-amber-500" />
    case "PAYMENT_DUE":
    case "PAYMENT_OVERDUE":
      return <CreditCard className="h-4 w-4 text-red-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-slate-500" />
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700"
    case "high":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch("/api/notifications?limit=5&unreadOnly=true")
        const result = await response.json()
        if (result.success) {
          setAlerts(result.data.notifications)
          setUnreadCount(result.data.unreadCount)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/notifications">
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        <CardDescription>Important notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No pending alerts</p>
            <p className="text-xs text-slate-400 mt-1">You are all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    {alert.priority !== "normal" && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1 ${getPriorityColor(alert.priority)}`}
                      >
                        {alert.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{alert.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatTimeAgo(alert.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
