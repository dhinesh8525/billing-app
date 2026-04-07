"use client"

/**
 * Usage Widget Component
 *
 * Shows current plan usage and limits on the dashboard.
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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Zap,
  FileText,
  Package,
  Users,
  ChevronRight,
  Loader2,
  Crown,
} from "lucide-react"

interface UsageData {
  planName: string
  planSlug: string
  usage: {
    invoices: { current: number; limit: number; unlimited: boolean }
    products: { current: number; limit: number; unlimited: boolean }
    users: { current: number; limit: number; unlimited: boolean }
  }
}

function UsageBar({
  label,
  icon: Icon,
  current,
  limit,
  unlimited,
}: {
  label: string
  icon: React.ElementType
  current: number
  limit: number
  unlimited: boolean
}) {
  const percentage = unlimited ? 0 : Math.min(100, (current / limit) * 100)
  const isNearLimit = !unlimited && percentage >= 80
  const isAtLimit = !unlimited && current >= limit

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="text-slate-600">{label}</span>
        </div>
        <span className={`font-medium ${isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-slate-900"}`}>
          {unlimited ? (
            <span className="text-emerald-600">Unlimited</span>
          ) : (
            `${current} / ${limit}`
          )}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
        />
      )}
    </div>
  )
}

export function UsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/usage")
        const result = await response.json()
        if (result.success) {
          setUsage({
            planName: result.data.planName,
            planSlug: result.data.planSlug,
            usage: {
              invoices: {
                current: result.data.usage.INVOICES || 0,
                limit: result.data.limits.maxInvoices,
                unlimited: result.data.limits.maxInvoices === -1,
              },
              products: {
                current: result.data.usage.PRODUCTS || 0,
                limit: result.data.limits.maxProducts,
                unlimited: result.data.limits.maxProducts === -1,
              },
              users: {
                current: result.data.usage.USERS || 0,
                limit: result.data.limits.maxUsers,
                unlimited: result.data.limits.maxUsers === -1,
              },
            },
          })
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Plan Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  const isPremium = usage.planSlug !== "free" && usage.planSlug !== "starter"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Plan Usage
          </CardTitle>
          <Badge
            variant={isPremium ? "default" : "secondary"}
            className={isPremium ? "bg-gradient-to-r from-amber-500 to-orange-500" : ""}
          >
            {isPremium && <Crown className="h-3 w-3 mr-1" />}
            {usage.planName}
          </Badge>
        </div>
        <CardDescription>This month&apos;s usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageBar
          label="Invoices"
          icon={FileText}
          current={usage.usage.invoices.current}
          limit={usage.usage.invoices.limit}
          unlimited={usage.usage.invoices.unlimited}
        />
        <UsageBar
          label="Products"
          icon={Package}
          current={usage.usage.products.current}
          limit={usage.usage.products.limit}
          unlimited={usage.usage.products.unlimited}
        />
        <UsageBar
          label="Team Members"
          icon={Users}
          current={usage.usage.users.current}
          limit={usage.usage.users.limit}
          unlimited={usage.usage.users.unlimited}
        />

        {!isPremium && (
          <div className="pt-3 border-t">
            <Button size="sm" className="w-full" asChild>
              <Link href="/subscription">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        )}

        {isPremium && (
          <Link
            href="/subscription"
            className="flex items-center justify-center gap-1 pt-3 border-t text-xs text-slate-500 hover:text-primary transition-colors"
          >
            Manage subscription
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
