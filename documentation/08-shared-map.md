# 08 — Shared Map Component (WisconsinMap)

> Reusable MapLibre GL JS + PMTiles choropleth component used by Election Map, Swing Modeler, Trends, and Comparison.

---

## Component Interface

```typescript
interface WisconsinMapProps {
  mapData?: MapDataResponse | null;       // Ward data for coloring
  selectedWardId?: string | null;         // Highlighted ward
  onWardClick?: (wardId, properties) => void;
  onWardHover?: (wardId, properties, point) => void;
  wardOpacities?: Record<string, number>; // Per-ward opacity (uncertainty)
  viewState?: MapViewState | null;        // Controlled view for syncing
  onMove?: (viewState: MapViewState) => void;
  onVisibleWardsChange?: (wardIds: string[]) => void;
}
```

---

## Architecture

### Tile Source

- **Format:** PMTiles (serverless vector tiles)
- **URL:** `pmtiles:///tiles/wards.pmtiles`
- **Source layer:** `wards`
- **ID promotion:** `promoteId: { wards: 'ward_id' }` — enables `setFeatureState` by ward ID

### Map Layers

| Layer ID | Type | Purpose |
|----------|------|---------|
| `background` | `background` | Light gray backdrop |
| `ward-fills` | `fill` | Choropleth fill — color driven by `feature-state.demPct` |
| `ward-lines` | `line` | Ward boundary outlines — width scales with zoom |
| `ward-highlight` | `line` | Bold black outline for selected/hovered wards |

### Data Binding (setFeatureState)

Election data is applied to the map via `setFeatureState` — no geometry re-upload needed. This enables sub-100ms election switching.

**Feature state fields set per ward:**
- `demPct` — Democratic percentage (drives fill color)
- `repPct` — Republican percentage
- `margin` — Vote margin
- `totalVotes` — Total votes
- `isEstimate` — Estimate flag
- `selected` — Boolean for highlight layer
- `hovered` — Boolean for highlight layer
- `opacity` — Per-ward opacity (uncertainty visualization)

### Change Detection

The `hasDataChanged` function avoids unnecessary re-rendering by sampling 10 wards for equality checks before applying new data. Checks `year`, `raceType`, `wardCount`, and sampled `demPct`/`margin` values.

---

## Map Configuration

| Setting | Value |
|---------|-------|
| Center | `[-87.95, 43.04]` (Milwaukee metro) |
| Default zoom | 9 |
| Max bounds | `[[-93.0, 42.3], [-86.7, 47.2]]` (Wisconsin extent) |
| Navigation control | Top-right (zoom + compass) |
| Cursor | `pointer` on ward hover, default otherwise |

### Line Width Scaling

Ward boundaries scale with zoom level:
- Zoom 7: 0.1px
- Zoom 10: 0.5px
- Zoom 14: 1px

---

## Viewport Syncing

Used by Election Comparison for side-by-side maps:

1. Map A moves → `onMove` fires with new `MapViewState`
2. Parent sets `viewState` on Map B
3. Map B calls `jumpTo()` with synced position
4. `isSyncing` ref prevents Map B from firing its own `onMove` back (avoids infinite loop)
5. `requestAnimationFrame` resets `isSyncing` after the jump completes

---

## Visible Wards Callback

Used by Trend Map for viewport-scoped summaries:

1. `moveend` and `idle` events trigger `emitVisible`
2. `queryRenderedFeatures` returns all wards currently on screen
3. Ward IDs are deduplicated and passed to `onVisibleWardsChange`

---

## Features Using This Component

| Feature | Props Used |
|---------|------------|
| Election Map | `mapData`, `selectedWardId`, `onWardClick`, `onWardHover` |
| Swing Modeler | `mapData`, `selectedWardId`, `onWardClick`, `onWardHover`, `wardOpacities` |
| Trend Map | `mapData`, `onWardHover`, `onVisibleWardsChange` |
| Comparison (side-by-side) | `mapData`, `viewState`, `onMove` |
| Difference Map | `mapData` (with diff data), `viewState`, `onMove` |

---

## Files

| File | Purpose |
|------|---------|
| `shared/components/WisconsinMap.tsx` | The component (React.memo wrapped) |
| `shared/lib/colorScale.ts` | RdBu choropleth fill color expression |
| `shared/lib/diffColorScale.ts` | Purple-orange diff fill color expression |
