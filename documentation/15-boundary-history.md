# 15 — Ward Boundary History

**Tagline:** Explore how Wisconsin's ward boundaries changed across redistricting cycles.

**Route:** `/boundaries`

---

## Overview

The Boundary History feature lets users visualize and compare ward boundary vintages across redistricting cycles. Wisconsin redraws ward boundaries after each Census and through ongoing municipal annexations. This page shows boundaries from 2011, 2017, 2020, and 2022 vintages with an animated timeline and comparison overlay mode.

---

## Data Model

### Ward Vintages (client-side constant)

```typescript
WARD_VINTAGES = [
  { vintage: 2011, label: '2011 Wards', description: 'Post-2010 Census redistricting' },
  { vintage: 2017, label: '2017 Wards', description: 'Mid-decade annexation updates' },
  { vintage: 2020, label: '2020 Wards', description: 'Canonical vintage for longitudinal analysis' },
  { vintage: 2022, label: '2022 Wards', description: 'Post-2020 Census redistricting' },
]
```

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/wards?vintage={year}` | Fetch ward count and metadata per vintage |
| GET | `/api/v1/wards/boundaries?vintage={year}&format=geojson` | Fetch GeoJSON boundaries for overlay |

---

## Dashboard Elements

### Sidebar (340px width)

1. **VintageTimeline** — Interactive timeline showing each vintage year as clickable nodes along a vertical line. Highlights the selected vintage. Includes:
   - Play/pause button to auto-advance through vintages (2s interval)
   - Comparison vintage selector (dropdown) for overlay mode
   - ARIA labels and keyboard navigation

2. **BoundaryStats** — Shows ward count for selected vintage and comparison vintage. Displays a difference card showing wards added/removed between the two.

3. **Overlay Legend** — When a comparison vintage is selected, shows a legend distinguishing current boundaries (from PMTiles) vs. comparison overlay (dashed amber lines from GeoJSON).

4. **Info Panel** — Static info box explaining ward vintages and the canonical 2020 vintage.

### Map Area

- **WisconsinMap** — Renders current wards from PMTiles
- **Overlay info card** — Shows which vintages are displayed and how many comparison wards are in the overlay
- **MapLegend** — Standard election color legend (bottom-left)

---

## Business Rules

1. The **2020 vintage** is the canonical set used for all longitudinal analysis
2. The **2022 vintage** reflects post-2020 Census redistricting
3. PMTiles only exist for the default vintage — comparison overlays use GeoJSON fetched from the API
4. Play animation cycles through all 4 vintages at 2-second intervals
5. Comparison overlay is optional — when null, only the selected vintage is shown

---

## Edge Cases

- **Single PMTiles file**: The map base layer always shows the default ward boundaries from PMTiles. Only the comparison overlay (GeoJSON) changes per vintage. Future work could add per-vintage PMTiles.
- **API unavailable**: If the boundaries API fails, the comparison overlay simply won't render (graceful degradation).
- **No ward count from PMTiles**: Ward count for the selected vintage is estimated at 0 when loaded from PMTiles (actual count comes from the tile metadata, not tracked in the component).

---

## Files

| File | Purpose |
|------|---------|
| `features/boundary-history/index.tsx` | Main page component with sidebar + map layout |
| `features/boundary-history/components/VintageTimeline.tsx` | Timeline with play/pause and comparison selector |
| `features/boundary-history/components/BoundaryStats.tsx` | Ward count stats and difference card |
| `features/boundary-history/hooks/useVintageBoundaries.ts` | TanStack Query hooks for vintage data and GeoJSON |
| `routes/index.tsx` | Route entry at `/boundaries` |
| `App.tsx` | Nav item with History icon |
