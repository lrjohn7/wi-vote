# 12 — PWA & Service Worker

> Progressive Web App configuration via vite-plugin-pwa and Workbox.

---

## Configuration

**File:** `packages/client/vite.config.ts`
**Plugin:** `vite-plugin-pwa` with `registerType: 'autoUpdate'`

### Key Settings

| Setting | Value | Reason |
|---------|-------|--------|
| `registerType` | `'autoUpdate'` | Auto-activates new service workers |
| `skipWaiting` | `true` | New SW activates immediately instead of waiting for all tabs to close |
| `manifest` | `false` | Uses custom `manifest.json` in `public/` |
| `globPatterns` | `**/*.{js,css,html,svg,png,woff2}` | Pre-caches all static assets |

### PMTiles Exclusion

PMTiles files are explicitly excluded from service worker caching:

```typescript
navigateFallbackDenylist: [/\/tiles\//]
```

**Reason:** PMTiles use HTTP Range requests. Workbox's CacheFirst strategy serves the wrong byte ranges from cache, corrupting tile data. Nginx already sets `Cache-Control: public, immutable` on `/tiles/`.

---

## Runtime Caching Rules

### Ward Boundaries API

| Setting | Value |
|---------|-------|
| Pattern | `/api/v1/wards/boundaries` |
| Strategy | `CacheFirst` |
| Cache name | `ward-boundaries` |
| Max age | 30 days |
| Cacheable statuses | `[0, 200]` |

Ward boundary GeoJSON (~25MB uncompressed, ~3MB gzipped) changes rarely and is expensive to transfer. CacheFirst with long TTL avoids re-downloading on every visit.

### All Other API Calls

| Setting | Value |
|---------|-------|
| Pattern | `/api/v1/` |
| Strategy | `NetworkFirst` |
| Cache name | `api-data` |
| Max age | 1 hour |
| Max entries | 100 |
| Cacheable statuses | `[0, 200]` |

NetworkFirst ensures fresh data when online, with cached fallback for offline use.

---

## Critical Fix: Cacheable Response Statuses

**Problem (audit item in CLAUDE.md):** Workbox previously cached HTTP error responses (504, 500). During Railway deploys, the API was temporarily unavailable. The 504 error response was cached. Subsequent requests served the stale 504 even after the API recovered.

**Fix:** Added `cacheableResponse: { statuses: [0, 200] }` to all runtime caching rules. Only successful responses (status 0 for opaque, 200 for OK) are cached. Error responses pass through without being stored.

---

## Build Output

### Chunk Splitting

```typescript
manualChunks: {
  'vendor-map': ['maplibre-gl', 'pmtiles'],
  'vendor-chart': ['recharts'],
  'vendor-react': ['react', 'react-dom', 'react-router'],
  'vendor-state': ['zustand', '@tanstack/react-query'],
}
```

Each feature module is also code-split via `React.lazy` in the router.

---

## Files

| File | Purpose |
|------|---------|
| `packages/client/vite.config.ts` | PWA plugin config, workbox rules, chunk splitting |
| `packages/client/public/manifest.json` | PWA manifest (app name, icons, theme) |
