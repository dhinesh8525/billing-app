# Offline Mode

Complete guide to offline functionality and PWA capabilities.

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Offline Capabilities](#offline-capabilities)
4. [Data Storage](#data-storage)
5. [Sync Process](#sync-process)
6. [PWA Installation](#pwa-installation)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Offline Mode ensures your restaurant can continue taking orders even when the internet goes down. Orders are stored locally and automatically synced when connectivity is restored.

### Key Features

- **Offline Order Taking**: Create orders without internet
- **Local Data Storage**: Products cached in IndexedDB
- **Automatic Sync**: Queue synced when online
- **Visual Indicator**: Clear online/offline status
- **PWA Support**: Install as native-like app

### Why It Matters

- **No Lost Sales**: Continue service during outages
- **Rural Reliability**: Works in areas with spotty internet
- **Peak Performance**: Reduce server load during rush
- **Disaster Recovery**: Data preserved if server issues

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   React App  │◀──▶│ IndexedDB    │◀──▶│Service Worker│  │
│  │              │    │ (Local Data) │    │  (Cache)     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server (API)                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js API │◀──▶│   Prisma     │◀──▶│  PostgreSQL  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Flow

```
ONLINE                           OFFLINE
   │                                │
   │  ┌────────────────────┐       │  ┌────────────────────┐
   │  │ Normal Operation   │       │  │ Offline Operation  │
   │  │ - API calls direct │       │  │ - Store in IndexedDB│
   │  │ - Real-time sync   │       │  │ - Queue for sync   │
   │  └────────────────────┘       │  └────────────────────┘
   │                                │
   └──────────── RECONNECT ─────────┘
                    │
                    ▼
           ┌────────────────────┐
           │ Sync Queue         │
           │ - Upload orders    │
           │ - Resolve conflicts│
           │ - Update local     │
           └────────────────────┘
```

---

## Offline Capabilities

### What Works Offline

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| View Products | ✅ Full | Cached locally |
| Create Orders | ✅ Full | Stored in IndexedDB |
| View Tables | ✅ Full | Cached status |
| Update Table Status | ✅ Partial | Queued for sync |
| View Invoices | ⚠️ Limited | Only cached invoices |
| Process Payment | ❌ No | Requires online |
| Print KOT | ✅ Yes | From local data |
| Reports | ❌ No | Requires server |

### Automatic Caching

These are cached automatically when online:

1. **Products**: Full catalog with prices
2. **Categories**: Product categories
3. **Tables**: Floor plans and table data
4. **Recent Orders**: Last 50 orders
5. **App Shell**: UI components and assets

### Data Freshness

| Data Type | Cache Duration | Refresh Trigger |
|-----------|---------------|-----------------|
| Products | 1 hour | Manual refresh, app open |
| Tables | 5 minutes | Page visit, manual |
| Orders | Real-time when online | Sync on reconnect |
| Static Assets | Until updated | Service worker update |

---

## Data Storage

### IndexedDB Stores

```javascript
// Database: billing-app-offline
{
  stores: {
    products: {
      keyPath: 'id',
      indexes: ['categoryId', 'sku', 'name']
    },
    orders: {
      keyPath: 'localId',
      indexes: ['status', 'tableId', 'createdAt']
    },
    offlineQueue: {
      keyPath: 'id',
      indexes: ['type', 'createdAt', 'status']
    },
    syncLog: {
      keyPath: 'id',
      indexes: ['timestamp', 'type']
    }
  }
}
```

### Storage Limits

| Browser | IndexedDB Limit | Practical Limit |
|---------|-----------------|-----------------|
| Chrome | 60% of disk | ~1GB+ |
| Firefox | 50% of disk | ~1GB+ |
| Safari | 1GB | ~500MB |
| Edge | 60% of disk | ~1GB+ |

### Data Cleanup

Old data is automatically cleaned:
- Orders older than 7 days (synced only)
- Sync logs older than 30 days
- Queue items after successful sync

---

## Sync Process

### Queue Structure

```javascript
{
  id: "queue-123",
  type: "CREATE_ORDER",
  payload: {
    tableId: "table-456",
    items: [...],
    // full order data
  },
  createdAt: "2024-05-13T10:30:00Z",
  attempts: 0,
  status: "pending",
  error: null
}
```

### Sync Algorithm

```
1. Check online status
2. If online:
   a. Get pending queue items (oldest first)
   b. For each item:
      - Attempt API call
      - If success: Remove from queue, update local
      - If fail: Increment attempts, log error
      - If max attempts: Mark as failed
   c. Pull latest data from server
   d. Update local stores
3. If offline:
   a. Continue normal operation
   b. Queue all write operations
```

### Conflict Resolution

When syncing orders created offline:

| Scenario | Resolution |
|----------|------------|
| Table no longer exists | Assign to default/takeaway |
| Product price changed | Use price at order time |
| Product deleted | Keep item with warning |
| Duplicate order number | Generate new number |

### Sync Indicators

```
┌─────────────────────────────────────┐
│ 🟢 Online                           │
│ ✓ All synced                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🟡 Syncing...                       │
│ ↻ 3 items remaining                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔴 Offline                          │
│ 5 items queued                      │
└─────────────────────────────────────┘
```

---

## PWA Installation

### What is PWA?

Progressive Web App (PWA) allows the billing app to be installed on devices like a native application.

### Benefits

- **Home Screen Icon**: Quick access like native app
- **Full Screen**: No browser chrome
- **Faster Load**: Cached assets
- **Offline Access**: Works without internet
- **Push Notifications**: (if enabled)

### Installation Steps

**Desktop (Chrome):**
1. Visit the app URL
2. Click install icon in address bar (or menu → Install)
3. Click "Install" in prompt
4. App opens in standalone window

**Mobile (Android):**
1. Open app in Chrome
2. Tap "Add to Home Screen" banner (or menu → Install)
3. Confirm installation
4. Find app icon on home screen

**Mobile (iOS):**
1. Open app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Name the app and tap "Add"

### PWA Manifest

Located at `/public/manifest.json`:

```json
{
  "name": "Billing App - Restaurant POS",
  "short_name": "Billing",
  "description": "Restaurant POS & Billing System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## API Reference

### Offline Service Methods

```typescript
import { OfflineService } from '@/services/offline.service'

// Initialize offline storage
await OfflineService.initialize()

// Cache products for offline use
await OfflineService.cacheProducts(products)

// Get cached products
const products = await OfflineService.getCachedProducts()

// Save order offline
const localId = await OfflineService.saveOfflineOrder(orderData)

// Get offline orders
const orders = await OfflineService.getOfflineOrders()

// Add to sync queue
await OfflineService.queueOperation({
  type: 'CREATE_ORDER',
  payload: orderData
})

// Process sync queue
await OfflineService.processQueue()

// Get queue status
const status = await OfflineService.getQueueStatus()
// { pending: 5, failed: 1, total: 6 }
```

### useOfflineMode Hook

```typescript
import { useOfflineMode } from '@/hooks/use-offline-mode'

function MyComponent() {
  const {
    isOnline,        // boolean: current network status
    isOfflineReady,  // boolean: offline data cached
    queuedCount,     // number: items waiting to sync
    lastSyncTime,    // Date: last successful sync
    sync,            // function: trigger manual sync
    clearQueue       // function: clear failed items
  } = useOfflineMode()

  return (
    <div>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
      {queuedCount > 0 && ` (${queuedCount} pending)`}
    </div>
  )
}
```

### Sync Endpoint

```http
POST /api/offline/sync
Content-Type: application/json

{
  "operations": [
    {
      "type": "CREATE_ORDER",
      "localId": "local-123",
      "payload": { /* order data */ },
      "createdAt": "2024-05-13T10:30:00Z"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "processed": 5,
    "failed": 0,
    "results": [
      {
        "localId": "local-123",
        "serverId": "server-456",
        "status": "success"
      }
    ]
  }
}
```

---

## Troubleshooting

### "Offline mode not available"

1. **Check browser support**: Must be modern browser (Chrome 70+, Firefox 65+, Safari 12+)
2. **Enable IndexedDB**: Check browser settings
3. **Clear and retry**: Clear site data and reload

### Data not syncing

1. **Check network**: Verify actual connectivity
2. **View queue**: Check pending items in DevTools
3. **Manual sync**: Click sync button
4. **Check errors**: Look for failed items in queue

### PWA not installing

1. **HTTPS required**: PWA only works on HTTPS
2. **Valid manifest**: Check manifest.json is accessible
3. **Service worker**: Verify SW is registered
4. **Clear cache**: Try incognito mode

### Storage quota exceeded

1. **Clear old data**: Remove old synced orders
2. **Export data**: Backup before clearing
3. **Check other sites**: Browser shares quota

### Conflict after sync

1. **Review changes**: Check sync log for details
2. **Manual resolution**: May need to adjust orders
3. **Contact support**: For complex conflicts

---

## Development Notes

### Testing Offline Mode

1. **Chrome DevTools**: Network tab → Offline checkbox
2. **Service Worker**: Application tab → Service Workers → Offline
3. **Real test**: Disconnect WiFi/ethernet

### Debugging IndexedDB

1. Open DevTools → Application tab
2. Expand IndexedDB section
3. View stores and data
4. Can delete/modify for testing

### Service Worker Updates

```javascript
// Force update (in DevTools console)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.update())
})
```

---

## Related Documentation

- [Restaurant POS Overview](./RESTAURANT-POS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
