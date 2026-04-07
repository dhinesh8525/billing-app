"use client"

/**
 * Header Navigation
 *
 * Top header with search, quick actions, and user menu.
 */

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Settings, LogOut, User, Keyboard } from "lucide-react"
import { TenantSwitcher } from "./tenant-switcher"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { MobileMenuButton } from "./mobile-sidebar"

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/invoices?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      {/* Mobile Menu Button + Tenant Switcher + Search */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1">
        <MobileMenuButton />
        <TenantSwitcher />
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="pl-10 pr-16 bg-slate-50 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px] font-medium hidden lg:inline-flex">
            ⌘K
          </kbd>
        </div>
      </form>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        <Button
          onClick={() => router.push("/billing")}
          className="bg-red-500 hover:bg-red-600 hidden sm:flex"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Sale
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push("/products/new")}
          className="border-primary text-primary hover:bg-primary/5 hidden md:flex"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>

        {/* Keyboard Shortcuts Hint */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex text-slate-400 hover:text-slate-600"
          onClick={() => {
            // Trigger the ? shortcut
            const event = new KeyboardEvent("keydown", {
              key: "?",
              shiftKey: true,
              bubbles: true,
            })
            document.dispatchEvent(event)
          }}
          title="Keyboard shortcuts (press ?)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {session?.user?.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{session?.user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {session?.user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
