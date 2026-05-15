/**
 * Stock Report Page - Coming Soon
 */

import { ComingSoon } from "@/components/coming-soon"

export default function StockReportPage() {
  return (
    <ComingSoon
      title="Stock Report"
      description="Detailed inventory and stock movement reports are coming soon."
      features={[
        "Current stock valuation",
        "Stock movement history",
        "Low stock alerts report",
        "Category-wise stock summary",
        "Stock aging analysis",
        "Reorder suggestions",
      ]}
      backHref="/reports"
      backLabel="Back to Reports"
    />
  )
}
