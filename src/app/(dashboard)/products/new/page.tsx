/**
 * New Product Page
 */

import { ProductForm } from "@/components/products/product-form"

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Item</h1>
        <p className="text-slate-500">Create a new product in your inventory</p>
      </div>

      <ProductForm />
    </div>
  )
}
