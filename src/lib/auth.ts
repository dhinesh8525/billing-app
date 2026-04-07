/**
 * NextAuth.js Configuration
 *
 * Implements credentials and OAuth authentication with role-based access control.
 * Supports multi-tenant architecture with tenant context in session.
 * Google OAuth users are automatically assigned STAFF role and get their own tenant.
 */

import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { Role } from "@prisma/client"
import { AuditService } from "@/services/audit.service"

type TenantRole = "OWNER" | "ADMIN" | "MEMBER"
import type { Adapter } from "next-auth/adapters"

/**
 * Extended session types for TypeScript
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      // Tenant context
      tenantId?: string
      tenantSlug?: string
      tenantName?: string
      tenantRole?: TenantRole
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    role: Role
    // Tenant context
    tenantId?: string
    tenantSlug?: string
    tenantName?: string
    tenantRole?: TenantRole
  }
}

/**
 * Get user's default tenant membership
 */
async function getUserDefaultTenant(userId: string) {
  // First try to get default tenant
  let membership = await prisma.tenantMembership.findFirst({
    where: {
      userId,
      isDefault: true,
      tenant: { isActive: true },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  })

  // If no default, get any active membership
  if (!membership) {
    membership = await prisma.tenantMembership.findFirst({
      where: {
        userId,
        tenant: { isActive: true },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    })

    // Set as default if found
    if (membership) {
      await prisma.tenantMembership.update({
        where: { id: membership.id },
        data: { isDefault: true },
      })
    }
  }

  return membership
}

/**
 * Create a new tenant for a user (for new OAuth signups)
 */
async function createTenantForUser(userId: string, userName: string, email: string) {
  // Generate slug from name or email
  const baseSlug = (userName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30)

  // Ensure unique slug
  let slug = baseSlug
  let counter = 1
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Get free plan
  const freePlan = await prisma.plan.findFirst({
    where: { slug: "free", isActive: true },
  })

  const now = new Date()
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days

  return prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: `${userName || "My"}'s Business`,
        slug,
        email,
        isActive: true,
      },
    })

    // Create subscription if plan exists
    if (freePlan) {
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          status: "TRIALING",
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        },
      })
    }

    // Create membership
    await tx.tenantMembership.create({
      data: {
        userId,
        tenantId: tenant.id,
        role: "OWNER",
        isDefault: true,
      },
    })

    // Create default settings
    await tx.settings.createMany({
      data: [
        {
          tenantId: tenant.id,
          key: "business",
          value: { name: tenant.name, email },
        },
        {
          tenantId: tenant.id,
          key: "tax",
          value: { defaultGstRate: 18, gstType: "regular", enableGst: true },
        },
        {
          tenantId: tenant.id,
          key: "invoice",
          value: { prefix: "INV", startNumber: 1, termsAndConditions: "" },
        },
      ],
    })

    // Create default cash account
    await tx.bankAccount.create({
      data: {
        tenantId: tenant.id,
        name: "Cash",
        type: "cash",
        balance: 0,
        isDefault: true,
        isActive: true,
      },
    })

    return tenant
  })
}

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Google OAuth Provider - users get STAFF role and their own tenant
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),

    // Credentials Provider for email/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) {
          throw new Error("Invalid email or password")
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact administrator.")
        }

        if (!user.passwordHash) {
          throw new Error("Please sign in with Google")
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          throw new Error("Invalid email or password")
        }

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email || ""
        token.name = user.name || ""

        // Fetch role from database for OAuth users
        if (account?.provider === "google") {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          })
          token.role = dbUser?.role || "STAFF"

          // Update last login for OAuth users
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          })
        } else {
          token.role = (user as { role: Role }).role
        }

        // Get or create tenant for user
        let membership = await getUserDefaultTenant(user.id)

        if (!membership && user.email) {
          // Create new tenant for new OAuth users
          await createTenantForUser(
            user.id,
            user.name || "",
            user.email
          )
          membership = await getUserDefaultTenant(user.id)
        }

        if (membership) {
          token.tenantId = membership.tenant.id
          token.tenantSlug = membership.tenant.slug
          token.tenantName = membership.tenant.name
          token.tenantRole = membership.role as TenantRole
        }
      }

      // Refresh tenant context on update trigger
      if (trigger === "update" && token.id) {
        const membership = await getUserDefaultTenant(token.id)
        if (membership) {
          token.tenantId = membership.tenant.id
          token.tenantSlug = membership.tenant.slug
          token.tenantName = membership.tenant.name
          token.tenantRole = membership.role as TenantRole
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
        session.user.tenantId = token.tenantId
        session.user.tenantSlug = token.tenantSlug
        session.user.tenantName = token.tenantName
        session.user.tenantRole = token.tenantRole
      }
      return session
    },

    async signIn({ user, account }) {
      // Check if user is active
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (existingUser && !existingUser.isActive) {
          return false // Block deactivated users
        }
      }
      return true
    },
  },

  events: {
    // When a new user is created via OAuth, ensure they have STAFF role
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "STAFF" },
      })

      // Log user creation
      await AuditService.log({
        userId: user.id,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id,
        metadata: {
          email: user.email,
          name: user.name,
          provider: "google",
        },
      })
    },

    // Log sign in events
    async signIn({ user, account }) {
      if (user.id) {
        // Get user's default tenant for context
        const membership = await prisma.tenantMembership.findFirst({
          where: { userId: user.id, isDefault: true },
        })

        await AuditService.log({
          tenantId: membership?.tenantId,
          userId: user.id,
          action: "LOGIN",
          entityType: "USER",
          entityId: user.id,
          metadata: {
            email: user.email,
            provider: account?.provider || "credentials",
          },
        })
      }
    },

    // Log sign out events
    async signOut({ token }) {
      if (token?.id) {
        await AuditService.log({
          tenantId: token.tenantId,
          userId: token.id,
          action: "LOGOUT",
          entityType: "USER",
          entityId: token.id,
          metadata: {
            email: token.email,
          },
        })
      }
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Get the current server session
 * Use this in Server Components and API routes
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Get the current authenticated user
 * Throws if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  return session.user
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  return session?.user?.role === "ADMIN"
}

/**
 * Require system admin role or throw
 */
export async function requireSystemAdmin() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return session.user
}
