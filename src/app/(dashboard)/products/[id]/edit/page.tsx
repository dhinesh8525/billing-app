/**
 * Edit Product Page
 * MULTI-TENANT: All data is scoped to the current tenant.
 */

import { notFound } from "next/navigation"
import { requireTenantContext } from "@/lib/tenant"
import { ProductService } from "@/services"
import { ProductForm } from "@/components/products/product-form"

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { tenantId } = await requireTenantContext()
  const { id } = await params

  let product
  try {
    product = await ProductService.getById(tenantId, id)
  } catch {
    notFound()
  }

  // Convert Decimal to number for the form
  const productData = {
    ...product,
    price: Number(product.price),
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    taxRate: product.taxRate ? Number(product.taxRate) : null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Item</h1>
        <p className="text-slate-500">Update product details</p>
      </div>

      <ProductForm product={productData} />
    </div>
  )
}
