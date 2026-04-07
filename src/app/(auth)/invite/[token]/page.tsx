"use client"

/**
 * Invitation Acceptance Page
 *
 * Displays invitation details and allows users to accept team invitations.
 */

import { useState, useEffect, use } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Users, CheckCircle, XCircle, LogIn } from "lucide-react"

interface InvitationDetails {
  email: string
  tenantName: string
  role: string
  expiresAt: string
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/team/invitations/${token}`)
        const data = await response.json()

        if (data.success) {
          setInvitation(data.data)
        } else {
          setError(data.error || "Invalid or expired invitation")
        }
      } catch {
        setError("Failed to load invitation")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  async function handleAccept() {
    if (!session?.user) {
      // Redirect to login with callback
      signIn(undefined, {
        callbackUrl: `/invite/${token}`,
      })
      return
    }

    setIsAccepting(true)

    try {
      const response = await fetch(`/api/team/invitations/${token}`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError(data.error)
      }
    } catch {
      setError("Failed to accept invitation")
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              You have successfully joined {invitation?.tenantName}. Redirecting
              to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
            <div>
              <p className="text-sm text-slate-500">Team</p>
              <p className="font-medium">{invitation?.tenantName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Invited as</p>
              <p className="font-medium capitalize">
                {invitation?.role.toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{invitation?.email}</p>
            </div>
          </div>

          {session?.user ? (
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                Signed in as <strong>{session.user.email}</strong>
              </p>
              {session.user.email !== invitation?.email && (
                <p className="text-xs text-blue-600 mt-1">
                  Note: You&apos;re accepting this invitation with a different
                  email than the one it was sent to.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-amber-50 border-amber-200 p-4">
              <p className="text-sm text-amber-700">
                Please sign in to accept this invitation
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/")}
          >
            Cancel
          </Button>
          {session?.user ? (
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Accept Invitation
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In to Accept
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
