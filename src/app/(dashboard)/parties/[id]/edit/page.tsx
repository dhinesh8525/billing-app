/**
 * Edit Party Page
 * MULTI-TENANT: All data is scoped to the current tenant.
 */

import { notFound } from "next/navigation"
import { requireTenantContext } from "@/lib/tenant"
import { PartyService } from "@/services"
import { PartyForm } from "@/components/parties/party-form"

interface EditPartyPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPartyPage({ params }: EditPartyPageProps) {
  const { tenantId } = await requireTenantContext()
  const { id } = await params

  let party
  try {
    party = await PartyService.getById(tenantId, id)
  } catch {
    notFound()
  }

  // Convert Decimal to number for the form
  const partyData = {
    ...party,
    openingBalance: Number(party.openingBalance),
    currentBalance: Number(party.currentBalance),
    creditLimit: party.creditLimit ? Number(party.creditLimit) : null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Party</h1>
        <p className="text-slate-500">Update party details</p>
      </div>

      <PartyForm party={partyData} />
    </div>
  )
}
