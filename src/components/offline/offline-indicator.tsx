"use client"

/**
 * Offline Indicator Component
 *
 * Shows online/offline status badge in the header.
 * Displays queued items count and sync status.
 */

import { useOfflineMode } from "@/hooks/use-offline-mode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function OfflineIndicator() {
  const {
    isOnline,
    isInitialized,
    queuedCount,
    lastSyncTime,
    sync,
  } = useOfflineMode()

  const [isSyncing, setIsSyncing] = useState(false)

  if (!isInitialized) {
    return null
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await sync()
      if (result.success) {
        toast.success(`Synced ${result.synced} items`)
      } else {
        toast.error(`Sync completed with errors: ${result.errors?.join(", ")}`)
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "hover:bg-accent hover:text-accent-foreground h-9 px-3",
          !isOnline && "text-red-600"
        )}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        {queuedCount > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5">
            {queuedCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isOnline ? "bg-green-100" : "bg-red-100"
            )}>
              {isOnline ? (
                <Cloud className="h-5 w-5 text-green-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isOnline ? "Online" : "Offline"}
              </p>
              <p className="text-xs text-slate-500">
                {isOnline
                  ? "All changes sync automatically"
                  : "Changes will sync when online"}
              </p>
            </div>
          </div>

          {/* Queue Status */}
          {queuedCount > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {queuedCount} pending {queuedCount === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Waiting to sync with server
              </p>
            </div>
          )}

          {queuedCount === 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">All synced</span>
              </div>
            </div>
          )}

          {/* Last Sync */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Last sync</span>
            <span className="font-medium">{formatLastSync(lastSyncTime)}</span>
          </div>

          {/* Sync Button */}
          {isOnline && queuedCount > 0 && (
            <Button
              className="w-full"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default OfflineIndicator
