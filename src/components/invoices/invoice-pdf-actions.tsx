"use client"

/**
 * Invoice PDF Actions
 *
 * Client component for PDF, print, and share functionality.
 */

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
  Printer,
  Download,
  Mail,
  Share2,
  MessageCircle,
  Link,
  Loader2,
  Check,
  Copy,
} from "lucide-react"

interface InvoicePdfActionsProps {
  invoiceId: string
  invoiceNumber: string
  customerEmail?: string | null
}

export function InvoicePdfActions({
  invoiceId,
  invoiceNumber,
  customerEmail,
}: InvoicePdfActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [email, setEmail] = useState(customerEmail || "")
  const [shareLink, setShareLink] = useState("")
  const [copied, setCopied] = useState(false)

  async function handlePrint() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf?format=html`)
      if (!response.ok) throw new Error("Failed to generate PDF")

      const html = await response.text()

      // Open in new window and print
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch {
      toast.error("Failed to print invoice")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDownload() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf?format=html`)
      if (!response.ok) throw new Error("Failed to generate PDF")

      const html = await response.text()

      // Open in new window for user to save as PDF
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        toast.success("Use your browser's Save as PDF option to download")
      }
    } catch {
      toast.error("Failed to download invoice")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleShareLink() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "link" }),
      })

      const result = await response.json()
      if (result.success) {
        setShareLink(result.data.shareUrl)
        setShareDialogOpen(true)
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast.error("Failed to generate share link")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleWhatsApp() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "whatsapp" }),
      })

      const result = await response.json()
      if (result.success && result.data.whatsappUrl) {
        window.open(result.data.whatsappUrl, "_blank")
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast.error("Failed to share via WhatsApp")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailSend() {
    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "email", email }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Invoice will be sent to ${email}`)
        setEmailDialogOpen(false)
        setEmail("")
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast.error("Failed to send email")
    } finally {
      setIsLoading(false)
    }
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Link copied to clipboard")
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEmailDialogOpen(true)}
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download
        </Button>

        <Button size="sm" onClick={handlePrint} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Print
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShareLink}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Send via Email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
            <DialogDescription>
              Copy the link below to share invoice #{invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input value={shareLink} readOnly className="flex-1" />
            <Button variant="outline" size="icon" onClick={copyShareLink}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send invoice #{invoiceNumber} via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailSend} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
