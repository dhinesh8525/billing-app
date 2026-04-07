"use client"

/**
 * Pricing Card Component
 *
 * Displays a plan with features and price.
 * Used on public pricing page and subscription management.
 */

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Loader2 } from "lucide-react"

interface PlanFeatures {
  maxProducts: number
  maxInvoices: number
  maxUsers: number
  maxParties: number
  reports: boolean
  multiLocation: boolean
  api: boolean
}

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billingInterval: "MONTHLY" | "YEARLY"
  features: PlanFeatures
  isPopular: boolean
}

interface PricingCardProps {
  plan: Plan
  isCurrentPlan?: boolean
  isLoading?: boolean
  onSelect?: (planId: string) => void
  actionLabel?: string
  disabled?: boolean
}

export function PricingCard({
  plan,
  isCurrentPlan = false,
  isLoading = false,
  onSelect,
  actionLabel,
  disabled = false,
}: PricingCardProps) {
  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format limit
  function formatLimit(value: number) {
    return value === -1 ? "Unlimited" : value.toString()
  }

  return (
    <Card
      className={`relative ${
        plan.isPopular ? "border-blue-500 border-2 shadow-lg" : ""
      }`}
    >
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-blue-500 hover:bg-blue-600">
            <Crown className="h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              {formatCurrency(plan.price)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            per {plan.billingInterval.toLowerCase().replace("ly", "")}
            {plan.billingInterval === "YEARLY" && (
              <span className="text-green-600 ml-1">(Save 20%)</span>
            )}
          </p>
        </div>

        {/* Features list */}
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{formatLimit(plan.features.maxProducts)} Products</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{formatLimit(plan.features.maxInvoices)} Invoices/month</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{formatLimit(plan.features.maxUsers)} Team Members</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>{formatLimit(plan.features.maxParties)} Parties</span>
          </li>
          {plan.features.reports && (
            <li className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Advanced Reports</span>
            </li>
          )}
          {plan.features.multiLocation && (
            <li className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Multi-Location Support</span>
            </li>
          )}
          {plan.features.api && (
            <li className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>API Access</span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={plan.isPopular ? "default" : "outline"}
            onClick={() => onSelect?.(plan.id)}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {actionLabel || "Select Plan"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
