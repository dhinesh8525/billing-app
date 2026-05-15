/**
 * New Party Page
 */

import { PartyForm } from "@/components/parties/party-form"

export default function NewPartyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Party</h1>
        <p className="text-slate-500">Create a new customer or supplier</p>
      </div>

      <PartyForm />
    </div>
  )
}
