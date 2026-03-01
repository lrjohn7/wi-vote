# 09 — State Management

> Zustand stores for client state + TanStack Query for server state.

---

## Zustand Stores

### mapStore (`stores/mapStore.ts`)

Global map state shared across Election Map and Ward Explorer.

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `viewport` | `{ center: [lng, lat], zoom }` | `[-87.95, 43.04], 7` | Map position |
| `selectedWardId` | `string \| null` | `null` | Currently selected ward |
| `hoveredWardId` | `string \| null` | `null` | Currently hovered ward |
| `activeElection` | `{ year, raceType } \| null` | `{ 2024, 'president' }` | Active election for map coloring |
| `displayMetric` | `string` | `'margin'` | What metric to visualize |
| `compareMode` | `boolean` | `false` | Comparison mode toggle |
| `compareElection` | `{ year, raceType } \| null` | `null` | Second election for comparison |

**Actions:** `setViewport`, `setSelectedWard`, `setHoveredWard`, `setActiveElection`, `setDisplayMetric`, `toggleCompareMode`, `setCompareElection`

**Cross-feature usage:**
- Ward Explorer's "View on Map" button calls `setSelectedWard(wardId)` then navigates to `/map`
- Ward Report's "View on Map" button does the same
- Election Map reads `activeElection` and `selectedWardId` for rendering

### modelStore (`stores/modelStore.ts`)

State for the Swing Modeler feature.

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `activeModelId` | `string` | `'uniform-swing'` | Currently selected model |
| `parameters` | `Record<string, unknown>` | `{}` | Current parameter values |
| `predictions` | `Prediction[] \| null` | `null` | Latest prediction results |
| `isComputing` | `boolean` | `false` | Whether Web Worker is computing |

**Actions:** `setActiveModel` (resets parameters), `setParameter`, `setParameters`, `setPredictions`, `setIsComputing`

---

## TanStack Query Configuration

### Query Key Factory (`services/queryKeys.ts`)

```typescript
queryKeys.wards.all        → ['wards']
queryKeys.wards.detail(id) → ['wards', id]
queryKeys.wards.search(q)  → ['wards', 'search', q]
queryKeys.elections.all     → ['elections']
queryKeys.elections.mapData(year, race) → ['elections', 'map', year, race]
queryKeys.trends.classify(race)        → ['trends', 'classify', race]
```

### Cache Times by Endpoint

| Endpoint | Stale Time | Cache Strategy |
|----------|-----------|----------------|
| `/elections` | 5 min | Server: 1 hour Cache-Control |
| `/elections/map-data/{y}/{r}` | 5 min | Server: 24 hour Cache-Control |
| `/wards/{id}` | 5 min | — |
| `/wards/search` | 30 sec | — |
| `/wards/{id}/report-card` | 10 min | — |
| `/wards/boundaries` | 30 days | CacheFirst (service worker) |
| `/trends/classify` | 5 min | — |

### Hooks by Feature

| Hook | Feature | Endpoint |
|------|---------|----------|
| `useElections` | election-map | `GET /elections` |
| `useMapData` | election-map | `GET /elections/map-data/{y}/{r}` |
| `useWardDetail` | election-map (shared) | `GET /wards/{id}` |
| `useWardSearch` | ward-explorer (shared) | `GET /wards/search` |
| `useReportCard` | ward-report | `GET /wards/{id}/report-card` |
| `useSpringElections` | supreme-court | `GET /spring-elections` + `/{year}/counties` |
| `useWardTrend` | trends | `GET /trends/ward/{id}` |
| `useAreaTrends` | trends | `GET /trends/area` |
| `useTrendClassifications` | trends | `GET /trends/classify` |
| `useBulkWardElections` | trends | `POST /trends/bulk-elections` |
| `useComparisonData` | comparison | `GET /elections/map-data` (×2) |
| `useModelData` | swing-modeler | `GET /elections/map-data` |

---

## Cross-Feature Dependencies

| Shared Hook | Defined In | Used By |
|-------------|-----------|---------|
| `useWardDetail` | `election-map/hooks/` | Ward Explorer, Ward Report |
| `useWardSearch` | `ward-explorer/hooks/` | Ward Report (WardFinder) |
| `useMapData` | `election-map/hooks/` | Swing Modeler (`useModelData`) |

---

## Files

| File | Purpose |
|------|---------|
| `stores/mapStore.ts` | Zustand: map viewport, selected ward, active election |
| `stores/modelStore.ts` | Zustand: model ID, parameters, predictions |
| `services/queryKeys.ts` | TanStack Query key factory |
| `services/api.ts` | API client functions (fetch wrappers) |
