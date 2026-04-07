"use client"

/**
 * Keyboard Shortcuts Hook
 *
 * Global keyboard shortcut handler for power user features.
 */

import { useEffect, useCallback, useRef } from "react"

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  // If true, requires a prefix key (like 'g' for go-to shortcuts)
  prefix?: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const prefixKeyRef = useRef<string | null>(null)
  const prefixTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      // Allow some shortcuts even in input fields (like Escape)
      const allowInInput = event.key === "Escape"

      if (isInputField && !allowInInput) {
        // Clear prefix if typing in input
        prefixKeyRef.current = null
        return
      }

      const key = event.key.toLowerCase()

      // Check for prefix key sequences (like 'g' then 'h' for go home)
      if (prefixKeyRef.current) {
        const prefix = prefixKeyRef.current
        prefixKeyRef.current = null

        if (prefixTimeoutRef.current) {
          clearTimeout(prefixTimeoutRef.current)
          prefixTimeoutRef.current = null
        }

        const shortcut = shortcuts.find(
          (s) =>
            s.prefix === prefix &&
            s.key.toLowerCase() === key &&
            !s.ctrl &&
            !s.meta &&
            !s.shift &&
            !s.alt
        )

        if (shortcut) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }

      // Check for regular shortcuts
      for (const shortcut of shortcuts) {
        const matchesKey = shortcut.key.toLowerCase() === key
        const matchesCtrl = shortcut.ctrl === event.ctrlKey
        const matchesMeta = shortcut.meta === event.metaKey
        const matchesShift = shortcut.shift === event.shiftKey
        const matchesAlt = shortcut.alt === event.altKey

        // Skip prefix shortcuts in first pass
        if (shortcut.prefix) continue

        if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }

      // Check if this could be a prefix key
      const hasPrefixShortcuts = shortcuts.some((s) => s.prefix === key)
      if (hasPrefixShortcuts && !event.ctrlKey && !event.metaKey && !event.altKey) {
        prefixKeyRef.current = key

        // Clear prefix after 1 second
        prefixTimeoutRef.current = setTimeout(() => {
          prefixKeyRef.current = null
        }, 1000)
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (prefixTimeoutRef.current) {
        clearTimeout(prefixTimeoutRef.current)
      }
    }
  }, [handleKeyDown])
}

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.prefix) {
    parts.push(shortcut.prefix.toUpperCase())
    parts.push("then")
  }

  if (shortcut.ctrl) parts.push("Ctrl")
  if (shortcut.meta) parts.push("⌘")
  if (shortcut.shift) parts.push("Shift")
  if (shortcut.alt) parts.push("Alt")

  parts.push(shortcut.key.toUpperCase())

  return parts.join(" + ").replace("+ then +", " then")
}
