"use client"

/**
 * Barcode Scanner Component
 *
 * Uses device camera to scan barcodes (EAN, UPC, Code128, etc.)
 * for quick product lookup during billing.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, ScanBarcode, AlertTriangle, Loader2 } from "lucide-react"
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library"

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (barcode: string) => void
}

export function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset()
      readerRef.current = null
    }
  }, [])

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // Get available video devices
      const devices = await reader.listVideoInputDevices()

      if (devices.length === 0) {
        setError("No camera found. Please connect a camera and try again.")
        setIsLoading(false)
        return
      }

      // Prefer back camera on mobile
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear")
      )
      const deviceId = backCamera?.deviceId || devices[0].deviceId

      // Start continuous scanning
      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcode = result.getText()

            // Prevent duplicate scans within 2 seconds
            if (barcode !== lastScanned) {
              setLastScanned(barcode)
              onScan(barcode)

              // Provide haptic feedback if available
              if (navigator.vibrate) {
                navigator.vibrate(100)
              }

              // Clear last scanned after 2 seconds
              setTimeout(() => setLastScanned(null), 2000)
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Scan error:", err)
          }
        }
      )

      setIsLoading(false)
    } catch (err) {
      console.error("Camera error:", err)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera access and try again.")
        } else if (err.name === "NotFoundError") {
          setError("No camera found. Please connect a camera and try again.")
        } else {
          setError(`Camera error: ${err.message}`)
        }
      } else {
        setError("Failed to access camera. Please try again.")
      }
      setIsLoading(false)
    }
  }, [lastScanned, onScan])

  useEffect(() => {
    if (open) {
      startScanning()
    } else {
      stopScanning()
      setLastScanned(null)
    }

    return () => {
      stopScanning()
    }
  }, [open, startScanning, stopScanning])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at a barcode to scan
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scan overlay */}
          {!isLoading && !error && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanning frame */}
              <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>

              {/* Scanning line animation */}
              <div className="absolute left-8 right-8 h-0.5 bg-primary animate-scan" />
            </div>
          )}

          {/* Last scanned indicator */}
          {lastScanned && (
            <div className="absolute bottom-4 left-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg text-center">
              <p className="text-sm font-medium">Scanned: {lastScanned}</p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Trigger button component
interface BarcodeScanButtonProps {
  onScan: (barcode: string) => void
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function BarcodeScanButton({
  onScan,
  variant = "outline",
  size = "icon",
  className,
}: BarcodeScanButtonProps) {
  const [open, setOpen] = useState(false)

  const handleScan = (barcode: string) => {
    onScan(barcode)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        title="Scan barcode"
      >
        <ScanBarcode className="h-4 w-4" />
      </Button>
      <BarcodeScanner open={open} onOpenChange={setOpen} onScan={handleScan} />
    </>
  )
}
