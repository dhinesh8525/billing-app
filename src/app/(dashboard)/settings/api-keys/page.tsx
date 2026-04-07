"use client"

/**
 * API Keys Management Page
 *
 * Create and manage API keys for public API access.
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Loader2,
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  Check,
  Lock,
} from "lucide-react"

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

const ALL_SCOPES = [
  { value: "read:products", label: "Read Products", description: "View products and inventory" },
  { value: "write:products", label: "Write Products", description: "Create and update products" },
  { value: "read:invoices", label: "Read Invoices", description: "View invoices and sales" },
  { value: "write:invoices", label: "Write Invoices", description: "Create invoices" },
  { value: "read:parties", label: "Read Parties", description: "View customers and suppliers" },
  { value: "write:parties", label: "Write Parties", description: "Create and update parties" },
  { value: "read:reports", label: "Read Reports", description: "Access analytics and reports" },
]

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [hasApiAccess, setHasApiAccess] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      checkApiAccess()
      loadKeys()
    }
  }, [status])

  async function checkApiAccess() {
    try {
      const response = await fetch("/api/usage")
      const result = await response.json()
      if (result.success) {
        setHasApiAccess(result.data.limits.apiAccess)
      }
    } catch {
      // Ignore
    }
  }

  async function loadKeys() {
    try {
      const response = await fetch("/api/api-keys")
      const result = await response.json()

      if (result.success) {
        setKeys(result.data)
      }
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setNewKey(result.data.key)
        loadKeys()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to create API key")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteKeyId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/api-keys/${deleteKeyId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast.success("API key revoked")
        loadKeys()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to revoke API key")
    } finally {
      setIsDeleting(false)
      setDeleteKeyId(null)
    }
  }

  function copyToClipboard() {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("API key copied to clipboard")
    }
  }

  function closeCreateDialog() {
    setIsCreateOpen(false)
    setNewKeyName("")
    setSelectedScopes([])
    setNewKey(null)
    setCopied(false)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Permission check
  const memberRole = session?.user?.tenantRole
  const canManageKeys = memberRole && ["OWNER", "ADMIN"].includes(memberRole)

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!canManageKeys) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Lock className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-slate-500">
          Only workspace owners and admins can manage API keys.
        </p>
      </div>
    )
  }

  if (!hasApiAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500">Manage API keys for programmatic access</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">API Access Not Available</h3>
            <p className="text-slate-500 mb-4">
              Upgrade your plan to access the public API and create API keys.
            </p>
            <Button asChild>
              <a href="/subscription">Upgrade Plan</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500">Manage API keys for programmatic access</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Key
        </Button>
      </div>

      {/* API Documentation Link */}
      <Card className="bg-slate-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">API Documentation</p>
              <p className="text-sm text-slate-500">
                Base URL: <code className="bg-slate-200 px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}/api/v1</code>
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/docs/api" target="_blank">View Docs</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            API keys are used to authenticate requests to the public API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 2).map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope.split(":")[1]}
                        </Badge>
                      ))}
                      {key.scopes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{key.scopes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDate(key.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.isActive ? "default" : "secondary"}>
                      {key.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteKeyId(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No API keys yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={closeCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {newKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? "Make sure to copy your API key now. You won't be able to see it again!"
                : "Create a new API key with specific permissions"}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  This is the only time you will see this key. Copy it now!
                </p>
              </div>

              <div className="relative">
                <Input
                  value={newKey}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ALL_SCOPES.map((scope) => (
                    <div
                      key={scope.value}
                      className="flex items-start gap-3 p-2 rounded hover:bg-slate-50"
                    >
                      <Checkbox
                        id={scope.value}
                        checked={selectedScopes.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedScopes([...selectedScopes, scope.value])
                          } else {
                            setSelectedScopes(
                              selectedScopes.filter((s) => s !== scope.value)
                            )
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={scope.value}
                          className="font-medium cursor-pointer"
                        >
                          {scope.label}
                        </label>
                        <p className="text-sm text-slate-500">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {newKey ? (
              <Button onClick={closeCreateDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeCreateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the API key. Any applications using this
              key will no longer be able to access the API. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
