/**
 * NextAuth.js Configuration
 *
 * Implements credentials and OAuth authentication with role-based access control.
 * Supports ADMIN and STAFF roles with different permission levels.
 * Google OAuth users are automatically assigned STAFF role.
 */

import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { Role } from "@prisma/client"
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
  }
}

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Google OAuth Provider - users get STAFF role
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, user, account }) {
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
      }
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
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
 * Require admin role or throw
 */
export async function requireAdmin() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return session.user
}
