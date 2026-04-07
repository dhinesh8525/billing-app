"use client"

/**
 * Mobile Sidebar Component
 *
 * Slide-out navigation drawer for mobile devices.
 */

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  BarChart3,
  Wallet,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Menu,
} from "lucide-react"

// Context for controlling sidebar from anywhere
interface MobileSidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null)

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext)
  if (!context) {
    throw new Error("useMobileSidebar must be used within MobileSidebarProvider")
  }
  return context
}

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <MobileSidebarContext.Provider value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

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

export function MobileSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const { isOpen, setIsOpen } = useMobileSidebar()
  const [openItems, setOpenItems] = useState<string[]>([])

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname, setIsOpen])

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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="flex h-16 items-center border-b px-4">
          <SheetTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Billing App</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto h-[calc(100vh-5rem)]">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
                item.children?.some((child) => pathname === child.href)

              const isItemOpen = openItems.includes(item.title)

              if (item.children) {
                return (
                  <div key={item.title}>
                    <button
                      onClick={() => toggleItem(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors",
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
                          isItemOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isItemOpen && (
                      <div className="pl-10 pt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block rounded-lg px-3 py-2.5 text-sm transition-colors",
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
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
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
      </SheetContent>
    </Sheet>
  )
}

export function MobileMenuButton() {
  const { toggle } = useMobileSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={toggle}
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
