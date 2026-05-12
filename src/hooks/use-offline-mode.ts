"use client"

/**
 * useOfflineMode Hook
 *
 * Provides offline status and sync functionality.
 */

import { useState, useEffect, useCallback } from "react"
import { OfflineService } from "@/services/offline.service"

interface UseOfflineModeResult {
  isOnline: boolean
  isInitialized: boolean
  queuedCount: number
  lastSyncTime: number | null
  sync: () => Promise<{ success: boolean; synced: number; errors?: string[] }>
  cacheProducts: (products: unknown[]) => Promise<void>
  getCachedProducts: () => Promise<unknown[]>
  searchCachedProducts: (query: string) => Promise<unknown[]>
  queueRequest: (url: string, method: string, body?: unknown) => Promise<void>
}

export function useOfflineMode(): UseOfflineModeResult {
  const [isOnline, setIsOnline] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await OfflineService.init()
        setIsInitialized(true)

        // Get initial queue count
        const count = await OfflineService.getQueueCount()
        setQueuedCount(count)

        // Get last sync time
        const lastSync = await OfflineService.getLastSyncTime()
        setLastSyncTime(lastSync)
      } catch (error) {
        console.error("Failed to initialize offline service:", error)
      }
    }

    init()
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isInitialized && queuedCount > 0) {
      sync()
    }
  }, [isOnline, isInitialized])

  // Sync function
  const sync = useCallback(async () => {
    try {
      const result = await OfflineService.syncQueue()
      const newCount = await OfflineService.getQueueCount()
      setQueuedCount(newCount)
      setLastSyncTime(result.timestamp)

      return {
        success: result.success,
        synced: result.itemsSynced,
        errors: result.errors,
      }
    } catch (error) {
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : "Sync failed"],
      }
    }
  }, [])

  // Cache products
  const cacheProducts = useCallback(async (products: unknown[]) => {
    await OfflineService.cacheProducts(products)
  }, [])

  // Get cached products
  const getCachedProducts = useCallback(async () => {
    return OfflineService.getCachedProducts()
  }, [])

  // Search cached products
  const searchCachedProducts = useCallback(async (query: string) => {
    return OfflineService.searchCachedProducts(query)
  }, [])

  // Queue a request
  const queueRequest = useCallback(async (url: string, method: string, body?: unknown) => {
    await OfflineService.queueRequest(url, method, body)
    const newCount = await OfflineService.getQueueCount()
    setQueuedCount(newCount)
  }, [])

  return {
    isOnline,
    isInitialized,
    queuedCount,
    lastSyncTime,
    sync,
    cacheProducts,
    getCachedProducts,
    searchCachedProducts,
    queueRequest,
  }
}

export default useOfflineMode
