/**
 * Team Service
 *
 * Manages team members and invitations for multi-tenant SaaS.
 * Handles member invitations, role management, and team listing.
 */

import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"
import { canAddUser } from "@/lib/feature-gate"
import { NotificationService } from "./notification.service"

export type TenantRole = "OWNER" | "ADMIN" | "MEMBER"

export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  role: TenantRole
  joinedAt: Date
  lastLogin: Date | null
  isActive: boolean
}

export interface PendingInvitation {
  id: string
  email: string
  role: TenantRole
  expiresAt: Date
  createdAt: Date
  invitedBy: string
}

/**
 * Team Service class
 */
export class TeamService {
  /**
   * Get all team members for a tenant
   */
  static async getMembers(tenantId: string): Promise<TeamMember[]> {
    const memberships = await prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLogin: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: "asc" },
      ],
    })

    return memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role as TenantRole,
      joinedAt: m.joinedAt,
      lastLogin: m.user.lastLogin,
      isActive: m.user.isActive,
    }))
  }

  /**
   * Get a single team member
   */
  static async getMember(
    tenantId: string,
    userId: string
  ): Promise<TeamMember | null> {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLogin: true,
          },
        },
      },
    })

    if (!membership) return null

    return {
      id: membership.id,
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role as TenantRole,
      joinedAt: membership.joinedAt,
      lastLogin: membership.user.lastLogin,
      isActive: membership.user.isActive,
    }
  }

  /**
   * Update a team member's role
   */
  static async updateMemberRole(
    tenantId: string,
    userId: string,
    newRole: TenantRole,
    requesterId: string
  ): Promise<TeamMember> {
    // Get the requester's membership
    const requesterMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId: requesterId, tenantId },
      },
    })

    if (!requesterMembership) {
      throw new Error("You are not a member of this team")
    }

    // Only OWNER can change roles
    if (requesterMembership.role !== "OWNER") {
      throw new Error("Only the owner can change member roles")
    }

    // Cannot change owner role
    const targetMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    })

    if (!targetMembership) {
      throw new Error("Member not found")
    }

    if (targetMembership.role === "OWNER") {
      throw new Error("Cannot change the owner's role")
    }

    // Cannot promote to OWNER
    if (newRole === "OWNER") {
      throw new Error("Cannot promote to owner. Transfer ownership instead.")
    }

    const updated = await prisma.tenantMembership.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLogin: true,
          },
        },
      },
    })

    return {
      id: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role as TenantRole,
      joinedAt: updated.joinedAt,
      lastLogin: updated.user.lastLogin,
      isActive: updated.user.isActive,
    }
  }

  /**
   * Remove a team member
   */
  static async removeMember(
    tenantId: string,
    userId: string,
    requesterId: string
  ): Promise<void> {
    // Get the requester's membership
    const requesterMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId: requesterId, tenantId },
      },
    })

    if (!requesterMembership) {
      throw new Error("You are not a member of this team")
    }

    // Only OWNER or ADMIN can remove members
    if (!["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      throw new Error("You don't have permission to remove members")
    }

    // Get the target membership
    const targetMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    })

    if (!targetMembership) {
      throw new Error("Member not found")
    }

    // Cannot remove OWNER
    if (targetMembership.role === "OWNER") {
      throw new Error("Cannot remove the owner")
    }

    // ADMIN cannot remove other ADMINs
    if (
      requesterMembership.role === "ADMIN" &&
      targetMembership.role === "ADMIN"
    ) {
      throw new Error("Admins cannot remove other admins")
    }

    await prisma.tenantMembership.delete({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    })
  }

  /**
   * Create an invitation
   */
  static async createInvitation(
    tenantId: string,
    email: string,
    role: TenantRole,
    invitedById: string
  ): Promise<PendingInvitation> {
    // Check plan limits
    const limitCheck = await canAddUser(tenantId)
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || "User limit reached. Upgrade your plan.")
    }

    // Check if user already exists in tenant
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { tenantId },
        },
      },
    })

    if (existingUser && existingUser.memberships.length > 0) {
      throw new Error("User is already a member of this team")
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        email_tenantId: { email, tenantId },
      },
    })

    if (existingInvitation) {
      // Update existing invitation
      const updated = await prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          role,
          token: randomBytes(32).toString("hex"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          invitedBy: invitedById,
        },
      })

      return {
        id: updated.id,
        email: updated.email,
        role: updated.role as TenantRole,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
        invitedBy: updated.invitedBy,
      }
    }

    // Create new invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        tenantId,
        role,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: invitedById,
      },
      include: {
        tenant: true,
      },
    })

    // Get inviter details for email
    const inviter = await prisma.user.findUnique({
      where: { id: invitedById },
      select: { name: true },
    })

    // Send invitation email
    await NotificationService.sendInvitationEmail({
      email,
      tenantName: invitation.tenant.name,
      inviterName: inviter?.name || "A team member",
      role,
      token: invitation.token,
    })

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as TenantRole,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    }
  }

  /**
   * Get pending invitations for a tenant
   */
  static async getPendingInvitations(
    tenantId: string
  ): Promise<PendingInvitation[]> {
    const invitations = await prisma.invitation.findMany({
      where: {
        tenantId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role as TenantRole,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy,
    }))
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(
    tenantId: string,
    invitationId: string
  ): Promise<void> {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    })

    if (!invitation) {
      throw new Error("Invitation not found")
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    })
  }

  /**
   * Accept an invitation (called when user signs up or logs in with invite token)
   */
  static async acceptInvitation(token: string, userId: string): Promise<{
    tenantId: string
    tenantName: string
    role: TenantRole
  }> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    })

    if (!invitation) {
      throw new Error("Invalid invitation token")
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.delete({ where: { id: invitation.id } })
      throw new Error("Invitation has expired")
    }

    // Check if user is already a member
    const existingMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId: invitation.tenantId },
      },
    })

    if (existingMembership) {
      await prisma.invitation.delete({ where: { id: invitation.id } })
      throw new Error("You are already a member of this team")
    }

    // Get user details for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    // Create membership and delete invitation
    await prisma.$transaction([
      prisma.tenantMembership.create({
        data: {
          userId,
          tenantId: invitation.tenantId,
          role: invitation.role,
          isDefault: false,
        },
      }),
      prisma.invitation.delete({ where: { id: invitation.id } }),
    ])

    // Notify tenant owner about new member
    if (user) {
      await NotificationService.notifyMemberJoined({
        tenantId: invitation.tenantId,
        memberName: user.name,
        memberEmail: user.email,
        role: invitation.role,
      })
    }

    return {
      tenantId: invitation.tenantId,
      tenantName: invitation.tenant.name,
      role: invitation.role as TenantRole,
    }
  }

  /**
   * Get invitation by token (for displaying invite details)
   */
  static async getInvitationByToken(token: string): Promise<{
    email: string
    tenantName: string
    role: TenantRole
    expiresAt: Date
  } | null> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    })

    if (!invitation || invitation.expiresAt < new Date()) {
      return null
    }

    return {
      email: invitation.email,
      tenantName: invitation.tenant.name,
      role: invitation.role as TenantRole,
      expiresAt: invitation.expiresAt,
    }
  }

  /**
   * Transfer ownership to another member
   */
  static async transferOwnership(
    tenantId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<void> {
    // Verify current owner
    const currentOwnerMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId: currentOwnerId, tenantId },
      },
    })

    if (!currentOwnerMembership || currentOwnerMembership.role !== "OWNER") {
      throw new Error("Only the current owner can transfer ownership")
    }

    // Verify new owner exists in tenant
    const newOwnerMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId: newOwnerId, tenantId },
      },
    })

    if (!newOwnerMembership) {
      throw new Error("New owner must be an existing team member")
    }

    // Transfer ownership
    await prisma.$transaction([
      // Make new owner
      prisma.tenantMembership.update({
        where: { id: newOwnerMembership.id },
        data: { role: "OWNER" },
      }),
      // Demote current owner to ADMIN
      prisma.tenantMembership.update({
        where: { id: currentOwnerMembership.id },
        data: { role: "ADMIN" },
      }),
    ])
  }

  /**
   * Leave a tenant (member leaves on their own)
   */
  static async leaveTenant(tenantId: string, userId: string): Promise<void> {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    })

    if (!membership) {
      throw new Error("You are not a member of this team")
    }

    // Owner cannot leave without transferring ownership
    if (membership.role === "OWNER") {
      throw new Error("Owner cannot leave. Transfer ownership first.")
    }

    await prisma.tenantMembership.delete({
      where: { id: membership.id },
    })

    // If this was user's default tenant, set another one as default
    if (membership.isDefault) {
      const anotherMembership = await prisma.tenantMembership.findFirst({
        where: { userId },
      })

      if (anotherMembership) {
        await prisma.tenantMembership.update({
          where: { id: anotherMembership.id },
          data: { isDefault: true },
        })
      }
    }
  }
}

export default TeamService
