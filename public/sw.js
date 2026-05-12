/**
 * Service Worker for Billing App PWA
 *
 * Provides offline caching and background sync capabilities.
 */

const CACHE_NAME = "billing-app-v2"
const API_CACHE_NAME = "billing-app-api-v1"
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
  "/billing",
  "/tables",
  "/products",
  "/invoices",
  "/kds",
]

// API routes that can be cached for offline use
const CACHEABLE_API_ROUTES = [
  "/api/products",
  "/api/categories",
  "/api/floor-plans",
  "/api/tables",
  "/api/raw-materials",
]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets")
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name)
            return caches.delete(name)
          })
      )
    })
  )
  // Take control immediately
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith("http")) {
    return
  }

  const url = new URL(event.request.url)

  // API requests - network first with cache fallback for cacheable routes
  if (url.pathname.startsWith("/api/")) {
    const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
      url.pathname.startsWith(route)
    )

    if (isCacheable) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Clone response for caching
            const responseClone = response.clone()
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
            return response
          })
          .catch(() => {
            // Network failed, try cache
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                console.log("[SW] Serving API from cache:", url.pathname)
                return cachedResponse
              }
              return new Response(
                JSON.stringify({ success: false, error: "Offline" }),
                { status: 503, headers: { "Content-Type": "application/json" } }
              )
            })
          })
      )
      return
    }
    // Non-cacheable API - just pass through
    return
  }

  // Static assets and pages - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone()

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/")
          }

          // Return empty response for other requests
          return new Response("", {
            status: 503,
            statusText: "Service Unavailable",
          })
        })
      })
  )
})

// Background sync for queued orders
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-orders") {
    console.log("[SW] Background sync triggered")
    event.waitUntil(notifyClientsToSync())
  }
})

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_REQUIRED" })
  })
}

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
      },
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
