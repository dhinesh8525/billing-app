/**
 * Cash & Bank Page - Coming Soon
 */

import { ComingSoon } from "@/components/coming-soon"

export default function CashBankPage() {
  return (
    <ComingSoon
      title="Cash & Bank"
      description="Complete cash and bank account management is coming soon."
      features={[
        "Multiple bank accounts management",
        "Cash in hand tracking",
        "UPI account integration",
        "Bank reconciliation",
        "Fund transfers between accounts",
        "Payment receipts and deposits",
        "Account statement generation",
      ]}
      backHref="/"
      backLabel="Back to Dashboard"
    />
  )
}
