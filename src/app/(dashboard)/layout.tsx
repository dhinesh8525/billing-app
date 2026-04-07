/**
 * Dashboard Layout
 *
 * Protected layout with sidebar and header navigation.
 * Requires authentication to access.
 * Responsive design with mobile sidebar and bottom navigation.
 */

import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileSidebarWrapper } from "@/components/layout/mobile-sidebar-wrapper"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <MobileSidebarWrapper>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="lg:ml-64">
          <Header />
          <main className="p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        </div>
      </div>
    </MobileSidebarWrapper>
  )
}
