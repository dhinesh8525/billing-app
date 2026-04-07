/**
 * Notification Service
 *
 * Handles sending notifications via email, in-app, etc.
 * Currently implements console logging as placeholder.
 * Replace with actual email service (SendGrid, Resend, etc.) in production.
 */

import { prisma } from "@/lib/db"

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export interface NotificationContext {
  tenantId?: string
  userId?: string
  tenantName?: string
  userName?: string
  email?: string
}

/**
 * Notification Service class
 */
export class NotificationService {
  /**
   * Send an email (placeholder - implement with email provider)
   */
  private static async sendEmail(options: EmailOptions): Promise<boolean> {
    // TODO: Implement with actual email service
    // Example providers: SendGrid, Resend, Mailgun, SES
    console.log("📧 Email notification:")
    console.log(`   To: ${options.to}`)
    console.log(`   Subject: ${options.subject}`)
    console.log(`   Body: ${options.text || options.html?.substring(0, 100)}...`)

    // Return true to indicate "sent" (for now, just logged)
    return true
  }

  /**
   * Get tenant context for notifications
   */
  private static async getTenantContext(
    tenantId: string
  ): Promise<NotificationContext | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!tenant) return null

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: tenant.email || undefined,
    }
  }

  /**
   * Get owner email for a tenant
   */
  private static async getTenantOwnerEmail(tenantId: string): Promise<string | null> {
    const ownership = await prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        role: "OWNER",
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    })

    return ownership?.user.email || null
  }

  // ============================================================================
  // TEAM NOTIFICATIONS
  // ============================================================================

  /**
   * Send team invitation email
   */
  static async sendInvitationEmail(data: {
    email: string
    tenantName: string
    inviterName: string
    role: string
    token: string
  }): Promise<boolean> {
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${data.token}`

    return this.sendEmail({
      to: data.email,
      subject: `You've been invited to join ${data.tenantName}`,
      text: `
Hi,

${data.inviterName} has invited you to join ${data.tenantName} as a ${data.role}.

Click the link below to accept the invitation:
${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The Billing App Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>You've been invited!</h2>
  <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> as a <strong>${data.role}</strong>.</p>
  <p style="margin: 30px 0;">
    <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
</div>
      `.trim(),
    })
  }

  /**
   * Notify tenant owner when someone joins
   */
  static async notifyMemberJoined(data: {
    tenantId: string
    memberName: string
    memberEmail: string
    role: string
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    const context = await this.getTenantContext(data.tenantId)

    return this.sendEmail({
      to: ownerEmail,
      subject: `New team member joined ${context?.tenantName || "your workspace"}`,
      text: `
Hi,

${data.memberName} (${data.memberEmail}) has joined your workspace as a ${data.role}.

You can manage your team in the settings.

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  // ============================================================================
  // SUBSCRIPTION NOTIFICATIONS
  // ============================================================================

  /**
   * Notify about subscription activation
   */
  static async notifySubscriptionActivated(data: {
    tenantId: string
    planName: string
    periodEnd: Date
  }): Promise<boolean> {
    const context = await this.getTenantContext(data.tenantId)
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)

    if (!ownerEmail) return false

    const formattedDate = data.periodEnd.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return this.sendEmail({
      to: ownerEmail,
      subject: `Your ${data.planName} subscription is now active`,
      text: `
Hi,

Great news! Your subscription to the ${data.planName} plan for ${context?.tenantName || "your workspace"} is now active.

Your current billing period ends on ${formattedDate}.

Thank you for choosing Billing App!

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  /**
   * Notify about subscription renewal
   */
  static async notifySubscriptionRenewed(data: {
    tenantId: string
    planName: string
    amount: number
    periodEnd: Date
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(data.amount)

    const formattedDate = data.periodEnd.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return this.sendEmail({
      to: ownerEmail,
      subject: `Payment received - ${data.planName} subscription renewed`,
      text: `
Hi,

We've successfully processed your payment of ${formattedAmount} for the ${data.planName} plan.

Your subscription is valid until ${formattedDate}.

Thank you for your continued trust in Billing App!

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  /**
   * Notify about payment failure
   */
  static async notifyPaymentFailed(data: {
    tenantId: string
    planName: string
    amount: number
    reason?: string
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(data.amount)

    return this.sendEmail({
      to: ownerEmail,
      subject: `Payment failed for your ${data.planName} subscription`,
      text: `
Hi,

We were unable to process your payment of ${formattedAmount} for the ${data.planName} plan.

${data.reason ? `Reason: ${data.reason}` : ""}

Please update your payment method to avoid service interruption.

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  /**
   * Notify about subscription cancellation
   */
  static async notifySubscriptionCancelled(data: {
    tenantId: string
    planName: string
    endDate: Date
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    const formattedDate = data.endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return this.sendEmail({
      to: ownerEmail,
      subject: `Your ${data.planName} subscription has been cancelled`,
      text: `
Hi,

Your ${data.planName} subscription has been cancelled.

You will continue to have access until ${formattedDate}.

We're sorry to see you go. If you change your mind, you can resubscribe anytime.

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  /**
   * Notify about trial ending soon
   */
  static async notifyTrialEndingSoon(data: {
    tenantId: string
    trialEndDate: Date
    daysRemaining: number
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    const context = await this.getTenantContext(data.tenantId)
    const formattedDate = data.trialEndDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return this.sendEmail({
      to: ownerEmail,
      subject: `Your trial ends in ${data.daysRemaining} days`,
      text: `
Hi,

Your free trial for ${context?.tenantName || "your workspace"} ends on ${formattedDate}.

To continue using all features without interruption, please choose a plan that fits your needs.

Best regards,
The Billing App Team
      `.trim(),
    })
  }

  /**
   * Notify about approaching usage limit
   */
  static async notifyUsageLimitApproaching(data: {
    tenantId: string
    resource: string
    currentUsage: number
    limit: number
    percentUsed: number
  }): Promise<boolean> {
    const ownerEmail = await this.getTenantOwnerEmail(data.tenantId)
    if (!ownerEmail) return false

    return this.sendEmail({
      to: ownerEmail,
      subject: `You're approaching your ${data.resource} limit`,
      text: `
Hi,

You've used ${data.percentUsed}% of your ${data.resource} limit (${data.currentUsage} of ${data.limit}).

Consider upgrading your plan to increase your limits and unlock more features.

Best regards,
The Billing App Team
      `.trim(),
    })
  }
}

export default NotificationService
