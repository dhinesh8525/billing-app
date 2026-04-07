"use client"

/**
 * Mobile Sidebar Wrapper
 *
 * Client component wrapper that provides mobile sidebar context
 * and renders the mobile navigation components.
 */

import { MobileSidebarProvider, MobileSidebar } from "./mobile-sidebar"
import { BottomNav } from "./bottom-nav"

export function MobileSidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      {children}
      <MobileSidebar />
      <BottomNav />
    </MobileSidebarProvider>
  )
}
