"use client"

/**
 * Bottom Navigation Component
 *
 * Mobile-friendly bottom navigation bar for quick access to main sections.
 * Only visible on mobile devices.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  Menu,
} from "lucide-react"
import { useMobileSidebar } from "./mobile-sidebar"

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Items",
    href: "/products",
    icon: Package,
  },
  {
    title: "Sale",
    href: "/billing",
    icon: ShoppingCart,
    primary: true,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    title: "More",
    href: "#menu",
    icon: Menu,
    isMenu: true,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { toggle } = useMobileSidebar()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-white safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          if (item.isMenu) {
            return (
              <button
                key={item.title}
                onClick={toggle}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-500 transition-colors",
                  "active:bg-slate-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.title}</span>
              </button>
            )
          }

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full -mt-4"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-lg">
                  <item.icon className="h-6 w-6" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                "active:bg-slate-100",
                isActive
                  ? "text-primary"
                  : "text-slate-500"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-xs", isActive && "font-medium")}>
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
