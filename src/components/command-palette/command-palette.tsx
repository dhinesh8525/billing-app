"use client"

/**
 * Command Palette Component
 *
 * Spotlight-style command palette for quick navigation and actions.
 * Triggered by Cmd/Ctrl + K.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Bell,
  Search,
  Plus,
  Keyboard,
  ArrowRight,
} from "lucide-react"

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
  category: "navigation" | "action" | "search"
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "home",
        title: "Go to Dashboard",
        description: "View dashboard and analytics",
        icon: Home,
        shortcut: "G H",
        action: () => router.push("/"),
        category: "navigation",
      },
      {
        id: "billing",
        title: "Go to Billing",
        description: "Create a new sale",
        icon: ShoppingCart,
        shortcut: "G B",
        action: () => router.push("/billing"),
        category: "navigation",
      },
      {
        id: "products",
        title: "Go to Products",
        description: "Manage inventory",
        icon: Package,
        shortcut: "G P",
        action: () => router.push("/products"),
        category: "navigation",
      },
      {
        id: "invoices",
        title: "Go to Invoices",
        description: "View all transactions",
        icon: FileText,
        shortcut: "G I",
        action: () => router.push("/invoices"),
        category: "navigation",
      },
      {
        id: "parties",
        title: "Go to Parties",
        description: "Customers and suppliers",
        icon: Users,
        shortcut: "G A",
        action: () => router.push("/parties"),
        category: "navigation",
      },
      {
        id: "reports",
        title: "Go to Reports",
        description: "Sales and GST reports",
        icon: BarChart3,
        shortcut: "G R",
        action: () => router.push("/reports"),
        category: "navigation",
      },
      {
        id: "settings",
        title: "Go to Settings",
        description: "Configure your workspace",
        icon: Settings,
        shortcut: "G S",
        action: () => router.push("/settings"),
        category: "navigation",
      },
      {
        id: "subscription",
        title: "Go to Subscription",
        description: "Manage your plan",
        icon: CreditCard,
        action: () => router.push("/subscription"),
        category: "navigation",
      },
      {
        id: "notifications",
        title: "Go to Notifications",
        description: "View all notifications",
        icon: Bell,
        action: () => router.push("/notifications"),
        category: "navigation",
      },

      // Actions
      {
        id: "new-sale",
        title: "New Sale",
        description: "Create a sale invoice",
        icon: Plus,
        shortcut: "N S",
        action: () => router.push("/billing"),
        category: "action",
      },
      {
        id: "new-product",
        title: "New Product",
        description: "Add a new product",
        icon: Plus,
        shortcut: "N P",
        action: () => router.push("/products/new"),
        category: "action",
      },
      {
        id: "new-party",
        title: "New Party",
        description: "Add customer or supplier",
        icon: Plus,
        shortcut: "N A",
        action: () => router.push("/parties?action=new"),
        category: "action",
      },

      // Search
      {
        id: "search-invoices",
        title: "Search Invoices",
        description: "Find transactions",
        icon: Search,
        action: () => router.push("/invoices"),
        category: "search",
      },
      {
        id: "search-products",
        title: "Search Products",
        description: "Find products",
        icon: Search,
        action: () => router.push("/products"),
        category: "search",
      },
    ],
    [router]
  )

  const filteredCommands = useMemo(() => {
    if (!search) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(searchLower) ||
        cmd.description?.toLowerCase().includes(searchLower)
    )
  }, [commands, search])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      search: [],
    }

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd)
    })

    return groups
  }, [filteredCommands])

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelectedIndex(0)
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
          break
        case "Enter":
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onOpenChange(false)
          }
          break
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  )

  const executeCommand = (command: CommandItem) => {
    command.action()
    onOpenChange(false)
  }

  let currentIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-slate-400 mr-2" />
          <Input
            placeholder="Type a command or search..."
            className="border-0 focus-visible:ring-0 px-0 py-4 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Badge variant="secondary" className="text-xs">
            esc
          </Badge>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No commands found
            </div>
          ) : (
            <>
              {/* Navigation Group */}
              {groupedCommands.navigation.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">
                    Navigation
                  </div>
                  {groupedCommands.navigation.map((cmd) => {
                    currentIndex++
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <CommandItemRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={isSelected}
                        onClick={() => executeCommand(cmd)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Actions Group */}
              {groupedCommands.action.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase mt-2">
                    Actions
                  </div>
                  {groupedCommands.action.map((cmd) => {
                    currentIndex++
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <CommandItemRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={isSelected}
                        onClick={() => executeCommand(cmd)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Search Group */}
              {groupedCommands.search.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase mt-2">
                    Search
                  </div>
                  {groupedCommands.search.map((cmd) => {
                    currentIndex++
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <CommandItemRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={isSelected}
                        onClick={() => executeCommand(cmd)}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↵</kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Press ? for shortcuts
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandItemRow({
  command,
  isSelected,
  onClick,
}: {
  command: CommandItem
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
        isSelected ? "bg-slate-100" : "hover:bg-slate-50"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          command.category === "action"
            ? "bg-primary/10 text-primary"
            : "bg-slate-100 text-slate-600"
        )}
      >
        <command.icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{command.title}</p>
        {command.description && (
          <p className="text-xs text-slate-500 truncate">{command.description}</p>
        )}
      </div>
      {command.shortcut && (
        <div className="flex-shrink-0 flex items-center gap-1">
          {command.shortcut.split(" ").map((key, i) => (
            <kbd
              key={i}
              className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500"
            >
              {key}
            </kbd>
          ))}
        </div>
      )}
      {isSelected && (
        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
      )}
    </button>
  )
}
