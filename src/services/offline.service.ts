/**
 * Offline Service
 *
 * Manages IndexedDB storage for offline operation.
 * Handles caching products, queuing transactions, and syncing when online.
 */

const DB_NAME = "billing-app-offline"
const DB_VERSION = 1

// Store names
const STORES = {
  PRODUCTS: "products",
  ORDERS: "orders",
  OFFLINE_QUEUE: "offline-queue",
  SYNC_LOG: "sync-log",
} as const

interface QueuedRequest {
  id: string
  url: string
  method: string
  body?: unknown
  timestamp: number
  retries: number
}

interface SyncLogEntry {
  id: string
  timestamp: number
  success: boolean
  itemsSynced: number
  errors?: string[]
}

class OfflineServiceClass {
  private db: IDBDatabase | null = null
  private isInitialized = false

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Products store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: "id" })
          productStore.createIndex("sku", "sku", { unique: true })
          productStore.createIndex("name", "name", { unique: false })
          productStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        // Orders store (for offline order creation)
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: "id" })
          orderStore.createIndex("status", "status", { unique: false })
          orderStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Offline queue for failed API calls
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: "id" })
          queueStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        // Sync log
        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const syncStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: "id" })
          syncStore.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error("IndexedDB not available")
    }
    return this.db
  }

  // ==========================================================================
  // PRODUCT CACHING
  // ==========================================================================

  /**
   * Cache products for offline use
   */
  async cacheProducts(products: unknown[]): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.PRODUCTS, "readwrite")
    const store = tx.objectStore(STORES.PRODUCTS)

    for (const product of products) {
      store.put({ ...(product as object), cachedAt: Date.now() })
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get cached products
   */
  async getCachedProducts(): Promise<unknown[]> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.PRODUCTS, "readonly")
    const store = tx.objectStore(STORES.PRODUCTS)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Search cached products
   */
  async searchCachedProducts(query: string): Promise<unknown[]> {
    const products = await this.getCachedProducts()
    const lowerQuery = query.toLowerCase()

    return products.filter((p: unknown) => {
      const product = p as { name?: string; sku?: string; barcode?: string }
      return (
        product.name?.toLowerCase().includes(lowerQuery) ||
        product.sku?.toLowerCase().includes(lowerQuery) ||
        product.barcode?.toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * Clear product cache
   */
  async clearProductCache(): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.PRODUCTS, "readwrite")
    const store = tx.objectStore(STORES.PRODUCTS)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // ==========================================================================
  // OFFLINE ORDER QUEUE
  // ==========================================================================

  /**
   * Save order for offline processing
   */
  async saveOfflineOrder(order: unknown): Promise<string> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.ORDERS, "readwrite")
    const store = tx.objectStore(STORES.ORDERS)

    const offlineOrder = {
      ...(order as object),
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isOffline: true,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
    }

    store.add(offlineOrder)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(offlineOrder.id)
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get pending offline orders
   */
  async getPendingOfflineOrders(): Promise<unknown[]> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.ORDERS, "readonly")
    const store = tx.objectStore(STORES.ORDERS)
    const index = store.index("status")

    return new Promise((resolve, reject) => {
      const request = index.getAll("pending")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark offline order as synced
   */
  async markOrderSynced(offlineId: string, serverId: string): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.ORDERS, "readwrite")
    const store = tx.objectStore(STORES.ORDERS)

    return new Promise((resolve, reject) => {
      const request = store.get(offlineId)
      request.onsuccess = () => {
        if (request.result) {
          const updated = {
            ...request.result,
            syncStatus: "synced",
            serverId,
            syncedAt: Date.now(),
          }
          store.put(updated)
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  // ==========================================================================
  // REQUEST QUEUE (for failed API calls)
  // ==========================================================================

  /**
   * Queue a failed request for retry
   */
  async queueRequest(url: string, method: string, body?: unknown): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.OFFLINE_QUEUE, "readwrite")
    const store = tx.objectStore(STORES.OFFLINE_QUEUE)

    const queuedRequest: QueuedRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      body,
      timestamp: Date.now(),
      retries: 0,
    }

    store.add(queuedRequest)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get queued requests
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.OFFLINE_QUEUE, "readonly")
    const store = tx.objectStore(STORES.OFFLINE_QUEUE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get queue count
   */
  async getQueueCount(): Promise<number> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.OFFLINE_QUEUE, "readonly")
    const store = tx.objectStore(STORES.OFFLINE_QUEUE)

    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove request from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.OFFLINE_QUEUE, "readwrite")
    const store = tx.objectStore(STORES.OFFLINE_QUEUE)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.OFFLINE_QUEUE, "readwrite")
    const store = tx.objectStore(STORES.OFFLINE_QUEUE)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // ==========================================================================
  // SYNC OPERATIONS
  // ==========================================================================

  /**
   * Sync all queued requests
   */
  async syncQueue(): Promise<SyncLogEntry> {
    const requests = await this.getQueuedRequests()
    const errors: string[] = []
    let synced = 0

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: req.body ? JSON.stringify(req.body) : undefined,
        })

        if (response.ok) {
          await this.removeFromQueue(req.id)
          synced++
        } else {
          const data = await response.json().catch(() => ({}))
          errors.push(`${req.url}: ${data.error || response.statusText}`)
        }
      } catch (error) {
        errors.push(`${req.url}: ${error instanceof Error ? error.message : "Network error"}`)
      }
    }

    // Log sync result
    const logEntry: SyncLogEntry = {
      id: `sync-${Date.now()}`,
      timestamp: Date.now(),
      success: errors.length === 0,
      itemsSynced: synced,
      errors: errors.length > 0 ? errors : undefined,
    }

    const db = await this.ensureDB()
    const tx = db.transaction(STORES.SYNC_LOG, "readwrite")
    const store = tx.objectStore(STORES.SYNC_LOG)
    store.add(logEntry)

    return logEntry
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<number | null> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORES.SYNC_LOG, "readonly")
    const store = tx.objectStore(STORES.SYNC_LOG)
    const index = store.index("timestamp")

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev")
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          resolve((cursor.value as SyncLogEntry).timestamp)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const OfflineService = new OfflineServiceClass()
export default OfflineService
