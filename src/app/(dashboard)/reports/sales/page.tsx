/**
 * Sales Report Page - Coming Soon
 */

import { ComingSoon } from "@/components/coming-soon"

export default function SalesReportPage() {
  return (
    <ComingSoon
      title="Sales Report"
      description="Comprehensive sales analytics and reporting is coming soon."
      features={[
        "Daily, weekly, monthly sales breakdown",
        "Top selling products analysis",
        "Sales by payment mode",
        "Customer-wise sales report",
        "Export to PDF and Excel",
        "Date range filtering",
      ]}
      backHref="/reports"
      backLabel="Back to Reports"
    />
  )
}
