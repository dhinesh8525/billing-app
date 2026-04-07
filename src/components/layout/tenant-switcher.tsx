"use client"

/**
 * Tenant Switcher Component
 *
 * Allows users to switch between workspaces they belong to.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Loader2,
} from "lucide-react"

interface UserTenant {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: string
  isDefault: boolean
}

export function TenantSwitcher() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()

  const [tenants, setTenants] = useState<UserTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTenantName, setNewTenantName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Load user's tenants
  useEffect(() => {
    async function loadTenants() {
      try {
        const response = await fetch("/api/tenants")
        const data = await response.json()
        if (data.success) {
          setTenants(data.data)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      loadTenants()
    }
  }, [session?.user])

  async function handleSwitch(tenantId: string) {
    if (tenantId === session?.user?.tenantId) return

    setIsSwitching(true)

    try {
      const response = await fetch("/api/tenants/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })

      const data = await response.json()

      if (data.success) {
        // Update session to reflect new tenant
        await updateSession()
        toast.success("Workspace switched")
        // Refresh the page to load new tenant data
        router.refresh()
        window.location.href = "/"
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to switch workspace")
    } finally {
      setIsSwitching(false)
    }
  }

  async function handleCreate() {
    if (!newTenantName.trim()) {
      toast.error("Please enter a workspace name")
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTenantName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Workspace created")
        setIsCreateOpen(false)
        setNewTenantName("")
        // Switch to the new tenant
        await handleSwitch(data.data.id)
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to create workspace")
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading || !session?.user) {
    return null
  }

  // Only show if user has multiple tenants or can create new ones
  const currentTenant = tenants.find((t) => t.tenantId === session.user.tenantId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 max-w-[200px]"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {currentTenant?.tenantName || session.user.tenantName || "Workspace"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.tenantId}
              onClick={() => handleSwitch(tenant.tenantId)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{tenant.tenantName}</span>
              </div>
              {tenant.tenantId === session.user.tenantId && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for a different business or project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                placeholder="My Business"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
