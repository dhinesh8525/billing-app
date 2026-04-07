"use client"

/**
 * Keyboard Shortcuts Provider
 *
 * Provides global keyboard shortcuts and command palette functionality.
 * Wrap your app with this provider to enable shortcuts.
 */

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { CommandPalette } from "./command-palette"
import { ShortcutsHelp } from "./shortcuts-help"
import { useKeyboardShortcuts, KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"
import { toast } from "sonner"

interface KeyboardProviderProps {
  children: React.ReactNode
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // Define global shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Command palette
    {
      key: "k",
      meta: true,
      description: "Open command palette",
      action: () => setCommandPaletteOpen(true),
    },
    {
      key: "k",
      ctrl: true,
      description: "Open command palette",
      action: () => setCommandPaletteOpen(true),
    },

    // Shortcuts help
    {
      key: "?",
      shift: true,
      description: "Show keyboard shortcuts",
      action: () => setShortcutsHelpOpen(true),
    },

    // Navigation shortcuts (G prefix)
    {
      prefix: "g",
      key: "h",
      description: "Go to Dashboard",
      action: () => {
        router.push("/")
        toast.success("Dashboard", { description: "Navigated to dashboard" })
      },
    },
    {
      prefix: "g",
      key: "b",
      description: "Go to Billing",
      action: () => {
        router.push("/billing")
        toast.success("Billing", { description: "Navigated to billing" })
      },
    },
    {
      prefix: "g",
      key: "p",
      description: "Go to Products",
      action: () => {
        router.push("/products")
        toast.success("Products", { description: "Navigated to products" })
      },
    },
    {
      prefix: "g",
      key: "i",
      description: "Go to Invoices",
      action: () => {
        router.push("/invoices")
        toast.success("Invoices", { description: "Navigated to invoices" })
      },
    },
    {
      prefix: "g",
      key: "a",
      description: "Go to Parties",
      action: () => {
        router.push("/parties")
        toast.success("Parties", { description: "Navigated to parties" })
      },
    },
    {
      prefix: "g",
      key: "r",
      description: "Go to Reports",
      action: () => {
        router.push("/reports")
        toast.success("Reports", { description: "Navigated to reports" })
      },
    },
    {
      prefix: "g",
      key: "s",
      description: "Go to Settings",
      action: () => {
        router.push("/settings")
        toast.success("Settings", { description: "Navigated to settings" })
      },
    },

    // Create new shortcuts (N prefix)
    {
      prefix: "n",
      key: "s",
      description: "New Sale",
      action: () => {
        router.push("/billing")
        toast.success("New Sale", { description: "Create a new sale invoice" })
      },
    },
    {
      prefix: "n",
      key: "p",
      description: "New Product",
      action: () => {
        router.push("/products/new")
        toast.success("New Product", { description: "Add a new product" })
      },
    },
    {
      prefix: "n",
      key: "a",
      description: "New Party",
      action: () => {
        router.push("/parties?action=new")
        toast.success("New Party", { description: "Add a new party" })
      },
    },

    // Quick search focus
    {
      key: "/",
      description: "Focus search",
      action: () => {
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="Search"]'
        ) as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      },
    },
  ]

  useKeyboardShortcuts({ shortcuts })

  // Close dialogs on route change
  useEffect(() => {
    setCommandPaletteOpen(false)
    setShortcutsHelpOpen(false)
  }, [pathname])

  return (
    <>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <ShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
    </>
  )
}
