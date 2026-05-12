"use client"

/**
 * New Recipe Page
 */

import { RecipeForm } from "@/components/recipes/recipe-form"

export default function NewRecipePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Recipe</h1>
        <p className="text-slate-500">Define ingredients and calculate food cost</p>
      </div>
      <RecipeForm />
    </div>
  )
}
