"use client"

/**
 * NextAuth Session Provider
 *
 * Wraps the application to provide session context to all components.
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

interface Props {
  children: React.ReactNode
}

export function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
