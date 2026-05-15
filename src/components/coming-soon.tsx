/**
 * Coming Soon Component
 *
 * Placeholder for features that are under development.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Construction, ArrowLeft, Sparkles } from "lucide-react"

interface ComingSoonProps {
  title: string
  description?: string
  features?: string[]
  backHref?: string
  backLabel?: string
}

export function ComingSoon({
  title,
  description = "We're working hard to bring you this feature. Stay tuned!",
  features = [],
  backHref = "/",
  backLabel = "Go Back",
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-4">
            <Construction className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.length > 0 && (
            <div className="text-left bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Upcoming Features
              </p>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li
                    key={index}
                    className="text-sm text-slate-600 flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-1">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
