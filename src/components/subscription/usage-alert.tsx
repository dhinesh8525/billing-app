"use client"

/**
 * Usage Alert Component
 *
 * Shows alerts when users are approaching plan limits.
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UsageData {
  percentages: {
    products: number
    invoices: number
    users: number
    parties: number
  }
}

export function UsageAlert() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/subscription/usage")
        const data = await response.json()
        if (data.success) {
          setUsage(data.data)
        }
      } catch {
        // Silently fail - not critical
      }
    }

    fetchUsage()
  }, [])

  if (dismissed || !usage) return null

  // Check if any resource is above 80%
  const warnings: string[] = []
  if (usage.percentages.products >= 80) warnings.push("products")
  if (usage.percentages.invoices >= 80) warnings.push("invoices")
  if (usage.percentages.users >= 80) warnings.push("team members")
  if (usage.percentages.parties >= 80) warnings.push("parties")

  if (warnings.length === 0) return null

  const isAtLimit = Object.values(usage.percentages).some((p) => p >= 100)

  return (
    <div
      className={`rounded-lg p-4 mb-4 ${
        isAtLimit
          ? "bg-red-50 border border-red-200"
          : "bg-amber-50 border border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            isAtLimit ? "text-red-600" : "text-amber-600"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isAtLimit ? "text-red-800" : "text-amber-800"
            }`}
          >
            {isAtLimit
              ? "You've reached your plan limit"
              : "You're approaching your plan limit"}
          </p>
          <p
            className={`text-sm mt-1 ${
              isAtLimit ? "text-red-700" : "text-amber-700"
            }`}
          >
            {warnings.join(", ")} {warnings.length === 1 ? "is" : "are"} at{" "}
            {isAtLimit ? "100%" : "80%+"} capacity.
          </p>
          <Link href="/subscription" className="inline-block mt-2">
            <Button size="sm" variant={isAtLimit ? "destructive" : "default"}>
              Upgrade Plan
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`${
            isAtLimit
              ? "text-red-400 hover:text-red-600"
              : "text-amber-400 hover:text-amber-600"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
