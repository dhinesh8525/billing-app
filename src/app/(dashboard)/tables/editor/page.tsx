"use client"

/**
 * Floor Plan Editor Page
 *
 * Visual editor for creating and arranging floor plan layouts.
 */

import { useSearchParams } from "next/navigation"
import { FloorPlanEditor } from "@/components/tables/floor-plan-editor"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

function EditorContent() {
  const searchParams = useSearchParams()
  const floorPlanId = searchParams.get("id") || undefined

  return <FloorPlanEditor floorPlanId={floorPlanId} />
}

export default function FloorPlanEditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Floor Plan Editor</h1>
        <p className="text-slate-500">Create and arrange your restaurant layout</p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <EditorContent />
      </Suspense>
    </div>
  )
}
