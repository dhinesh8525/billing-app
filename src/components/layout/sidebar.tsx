"use client"

/**
 * Sidebar Navigation
 *
 * Vyapar-style left sidebar with navigation links.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  BarChart3,
  Wallet,
  AlertTriangle,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  LayoutGrid,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react"
import { useState, useEffect } from "react"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: string
  adminOnly?: boolean
  children?: { title: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: "Tables",
    href: "/tables",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    title: "Items",
    href: "/products",
    icon: <Package className="h-5 w-5" />,
  },
  {
    title: "Sale",
    href: "/billing",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    title: "Kitchen",
    href: "/kds",
    icon: <ChefHat className="h-5 w-5" />,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Parties",
    href: "/parties",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Recipes",
    href: "/recipes",
    icon: <UtensilsCrossed className="h-5 w-5" />,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: <BarChart3 className="h-5 w-5" />,
    children: [
      { title: "Sales Report", href: "/reports/sales" },
      { title: "Stock Report", href: "/reports/stock" },
      { title: "Party Report", href: "/reports/parties" },
      { title: "Analytics", href: "/reports/analytics" },
    ],
  },
  {
    title: "Cash & Bank",
    href: "/cash-bank",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    title: "Subscription",
    href: "/subscription",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
    children: [
      { title: "General", href: "/settings" },
      { title: "Workspace", href: "/settings/workspace" },
      { title: "Bill Format", href: "/settings/bill-format" },
      { title: "Team", href: "/settings/team" },
      { title: "API Keys", href: "/settings/api-keys" },
      { title: "Notifications", href: "/notifications" },
      { title: "Activity Log", href: "/settings/activity" },
    ],
  },
  {
    title: "Admin",
    href: "/admin",
    icon: <ShieldCheck className="h-5 w-5" />,
    adminOnly: true,
    children: [
      { title: "Dashboard", href: "/admin" },
      { title: "Workspaces", href: "/admin/tenants" },
      { title: "Plans", href: "/admin/plans" },
      { title: "Audit Logs", href: "/admin/audit-logs" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const [openItems, setOpenItems] = useState<string[]>(() => {
    // Initialize with items that have active children
    const initialOpen: string[] = []
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      navItems.forEach((item) => {
        if (item.children) {
          const isChildActive = item.children.some(
            (child) => path === child.href || path.startsWith(child.href + "/")
          )
          if (isChildActive) {
            initialOpen.push(item.title)
          }
        }
      })
    }
    return initialOpen
  })

  // Auto-open items when route changes
  useEffect(() => {
    setOpenItems((prev) => {
      const newOpen = [...prev]
      navItems.forEach((item) => {
        if (item.children) {
          const isChildActive = item.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          )
          if (isChildActive && !newOpen.includes(item.title)) {
            newOpen.push(item.title)
          }
        }
      })
      return newOpen
    })
  }, [pathname])

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white hidden lg:block">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Billing App</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto h-[calc(100vh-8rem)]">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
              item.children?.some((child) => pathname === child.href)

            const isOpen = openItems.includes(item.title)

            if (item.children) {
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleItem(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.title}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="pl-10 pt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            pathname === child.href
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {item.icon}
                {item.title}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
      </nav>

      {/* Low stock alert (demo) */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-amber-50 p-3">
        <Link
          href="/products?lowStock=true"
          className="flex items-center gap-2 text-sm text-amber-700"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>3 items low in stock</span>
        </Link>
      </div>
    </aside>
  )
}
