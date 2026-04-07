"use client"

/**
 * Quick Actions Component
 *
 * Provides quick access to common tasks from the dashboard.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ShoppingCart,
  Package,
  Users,
  FileText,
  Download,
  Calculator,
  Receipt,
} from "lucide-react"

const quickActions = [
  {
    title: "New Sale",
    description: "Create a sale invoice",
    href: "/billing",
    icon: ShoppingCart,
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    title: "Add Item",
    description: "Add new product",
    href: "/products/new",
    icon: Package,
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    title: "Add Party",
    description: "New customer/supplier",
    href: "/parties?action=new",
    icon: Users,
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    title: "View Invoices",
    description: "All transactions",
    href: "/invoices",
    icon: FileText,
    color: "bg-amber-500 hover:bg-amber-600",
  },
]

const secondaryActions = [
  {
    title: "Export Data",
    href: "/reports",
    icon: Download,
  },
  {
    title: "GST Report",
    href: "/reports",
    icon: Calculator,
  },
  {
    title: "All Reports",
    href: "/reports/analytics",
    icon: Receipt,
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Actions - Grid */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-start gap-1 hover:border-primary/50"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{action.title}</span>
              </Link>
            </Button>
          ))}
        </div>

        {/* Secondary Actions - List */}
        <div className="pt-3 border-t space-y-1">
          {secondaryActions.map((action) => (
            <Link
              key={action.href + action.title}
              href={action.href}
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-md transition-colors"
            >
              <action.icon className="h-4 w-4" />
              {action.title}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
