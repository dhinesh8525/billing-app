"use client"

/**
 * Shortcuts Help Modal
 *
 * Shows all available keyboard shortcuts.
 * Triggered by pressing '?' key.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

interface ShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialog / Clear selection" },
    ],
  },
  {
    title: "Navigation (press G, then...)",
    shortcuts: [
      { keys: ["G", "H"], description: "Go to Dashboard (Home)" },
      { keys: ["G", "B"], description: "Go to Billing" },
      { keys: ["G", "P"], description: "Go to Products" },
      { keys: ["G", "I"], description: "Go to Invoices" },
      { keys: ["G", "A"], description: "Go to Parties" },
      { keys: ["G", "R"], description: "Go to Reports" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    title: "Create New (press N, then...)",
    shortcuts: [
      { keys: ["N", "S"], description: "New Sale" },
      { keys: ["N", "P"], description: "New Product" },
      { keys: ["N", "A"], description: "New Party" },
    ],
  },
  {
    title: "Billing Page",
    shortcuts: [
      { keys: ["F2"], description: "Focus product search" },
      { keys: ["F3"], description: "Focus customer name" },
      { keys: ["F12"], description: "Open payment dialog" },
      { keys: ["+"], description: "Increase quantity" },
      { keys: ["-"], description: "Decrease quantity" },
      { keys: ["Del"], description: "Remove selected item" },
    ],
  },
  {
    title: "Tables & Lists",
    shortcuts: [
      { keys: ["J"], description: "Move down" },
      { keys: ["K"], description: "Move up" },
      { keys: ["Enter"], description: "Open / Select" },
      { keys: ["/"], description: "Focus search" },
    ],
  },
]

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-slate-600">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-700 min-w-[24px] text-center">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-slate-400 mx-0.5 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">Esc</kbd> to close this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
