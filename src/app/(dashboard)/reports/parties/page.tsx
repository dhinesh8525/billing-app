/**
 * Party Report Page - Coming Soon
 */

import { ComingSoon } from "@/components/coming-soon"

export default function PartyReportPage() {
  return (
    <ComingSoon
      title="Party Report"
      description="Customer and supplier analytics reports are coming soon."
      features={[
        "Customer ledger summary",
        "Outstanding receivables report",
        "Outstanding payables report",
        "Party-wise transaction history",
        "Credit utilization analysis",
        "Aging analysis for dues",
      ]}
      backHref="/reports"
      backLabel="Back to Reports"
    />
  )
}
