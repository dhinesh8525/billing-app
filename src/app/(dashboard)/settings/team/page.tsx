"use client"

/**
 * Team Management Page
 *
 * Manage team members, roles, and invitations.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  ShieldCheck,
  Crown,
  Loader2,
  Clock,
  X,
  Copy,
} from "lucide-react"

type TenantRole = "OWNER" | "ADMIN" | "MEMBER"

interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  role: TenantRole
  joinedAt: string
  lastLogin: string | null
  isActive: boolean
}

interface PendingInvitation {
  id: string
  email: string
  role: TenantRole
  expiresAt: string
  createdAt: string
  invitedBy: string
}

const roleLabels: Record<TenantRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
}

const roleIcons: Record<TenantRole, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-amber-500" />,
  ADMIN: <ShieldCheck className="h-4 w-4 text-blue-500" />,
  MEMBER: <Shield className="h-4 w-4 text-slate-400" />,
}

const roleBadgeColors: Record<TenantRole, string> = {
  OWNER: "bg-amber-100 text-amber-700 border-amber-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  MEMBER: "bg-slate-100 text-slate-700 border-slate-200",
}

export default function TeamPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<TenantRole>("MEMBER")

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER")
  const [isInviting, setIsInviting] = useState(false)

  // Load team data
  useEffect(() => {
    loadTeam()
  }, [])

  async function loadTeam() {
    try {
      const response = await fetch("/api/team")
      const data = await response.json()

      if (data.success) {
        setMembers(data.data.members)
        setInvitations(data.data.invitations)
        setCurrentUserId(data.data.currentUserId)
        setCurrentUserRole(data.data.currentUserRole)
      }
    } catch {
      toast.error("Failed to load team")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address")
      return
    }

    setIsInviting(true)

    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setIsInviteOpen(false)
        setInviteEmail("")
        setInviteRole("MEMBER")
        loadTeam()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  async function handleUpdateRole(userId: string, newRole: "ADMIN" | "MEMBER") {
    try {
      const response = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Role updated")
        loadTeam()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to update role")
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) {
      return
    }

    try {
      const response = await fetch(`/api/team/${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Member removed")
        loadTeam()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to remove member")
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      const response = await fetch(`/api/team/invitations?id=${invitationId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Invitation cancelled")
        loadTeam()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to cancel invitation")
    }
  }

  function copyInviteLink(email: string) {
    const link = `${window.location.origin}/invite?email=${encodeURIComponent(email)}`
    navigator.clipboard.writeText(link)
    toast.success("Invite link copied")
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  function formatRelativeTime(dateString: string | null) {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  const canManageTeam = ["OWNER", "ADMIN"].includes(currentUserRole)
  const isOwner = currentUserRole === "OWNER"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500">
            Manage your team members and permissions
          </p>
        </div>
        {canManageTeam && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "ADMIN" | "MEMBER")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Member - Can view and create
                        </div>
                      </SelectItem>
                      {isOwner && (
                        <SelectItem value="ADMIN">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Admin - Can manage team
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
          <CardDescription>
            People with access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                {canManageTeam && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {member.name}
                          {member.userId === currentUserId && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleBadgeColors[member.role]}
                    >
                      <span className="mr-1">{roleIcons[member.role]}</span>
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatRelativeTime(member.lastLogin)}
                  </TableCell>
                  {canManageTeam && (
                    <TableCell>
                      {member.role !== "OWNER" &&
                        member.userId !== currentUserId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isOwner && member.role === "MEMBER" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.userId, "ADMIN")
                                  }
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {isOwner && member.role === "ADMIN" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.userId, "MEMBER")
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make Member
                                </DropdownMenuItem>
                              )}
                              {(isOwner ||
                                (currentUserRole === "ADMIN" &&
                                  member.role === "MEMBER")) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      handleRemoveMember(
                                        member.userId,
                                        member.name
                                      )
                                    }
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Remove from Team
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that have not been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  {canManageTeam && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleBadgeColors[invitation.role]}
                      >
                        {roleLabels[invitation.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(invitation.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(invitation.expiresAt)}
                    </TableCell>
                    {canManageTeam && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invitation.email)}
                            title="Copy invite link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleCancelInvitation(invitation.id)
                            }
                            title="Cancel invitation"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Crown className="h-4 w-4 text-amber-500" />
                Owner
              </div>
              <ul className="text-sm text-slate-500 space-y-1 pl-6 list-disc">
                <li>Full access to all features</li>
                <li>Manage billing & subscription</li>
                <li>Transfer ownership</li>
                <li>Delete workspace</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                Admin
              </div>
              <ul className="text-sm text-slate-500 space-y-1 pl-6 list-disc">
                <li>Manage team members</li>
                <li>Invite new members</li>
                <li>Access all data</li>
                <li>Manage settings</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-slate-400" />
                Member
              </div>
              <ul className="text-sm text-slate-500 space-y-1 pl-6 list-disc">
                <li>View data</li>
                <li>Create invoices</li>
                <li>Manage products</li>
                <li>Cannot manage team</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
