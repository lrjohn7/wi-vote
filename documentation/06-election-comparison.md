# 06 — Election Comparison

> Side-by-side or difference map view comparing two elections.

**Route:** `/compare`

---

## Data Model

### Comparison Data

| Field | Type | Description |
|-------|------|-------------|
| `mapDataA` | `MapDataResponse` | Election A ward-level results |
| `mapDataB` | `MapDataResponse` | Election B ward-level results |
| `diffData` | `MapDataResponse` | Computed difference: A margin minus B margin per ward |

### Diff Entry (per ward)

| Field | Type | Description |
|-------|------|-------------|
| `demPct` | `number` | Difference in Dem percentage (A - B) |
| `repPct` | `number` | Difference in Rep percentage (A - B) |
| `margin` | `number` | Difference in margin (A - B). Positive = more D in A |
| `diffMargin` | `number` | Same as margin, used by diff color scale |
| `totalVotes` | `number` | Difference in total votes |

---

## API Endpoints

Uses existing endpoints — no dedicated comparison API:

- `GET /api/v1/elections/map-data/{yearA}/{raceA}` — fetches Election A data
- `GET /api/v1/elections/map-data/{yearB}/{raceB}` — fetches Election B data

The `useComparisonData` hook fetches both in parallel and computes the diff client-side.

---

## Dashboard Elements

### Top Bar

| Element | Type | Behavior |
|---------|------|----------|
| "Compare Elections" heading | `<h2>` | |
| Election A selector | `ComparisonSelector` | Year dropdown + race dropdown |
| "vs" label | Text | Between the two selectors |
| Election B selector | `ComparisonSelector` | Year dropdown + race dropdown |
| View mode toggle | Segmented button | "Side by Side" / "Difference" |

### Side-by-Side Mode

| Element | Type | Behavior |
|---------|------|----------|
| Left map | `WisconsinMap` | Election A results with standard RdBu scale |
| Right map | `WisconsinMap` | Election B results with standard RdBu scale |
| Map labels | Overlay text | "Election A: {year} {race}" / "Election B: {year} {race}" |
| Legend | `MapLegend` | Shared legend between both maps |
| Viewport sync | Automatic | Pan/zoom on either map syncs the other via `syncedView` state |

### Difference Mode

| Element | Type | Behavior |
|---------|------|----------|
| Single map | `DifferenceMap` | Wards colored by margin shift using purple-orange scale |
| Diff legend | Custom legend | Purple (R shift) → White (no change) → Orange (D shift) |

---

## Business Rules

1. **Defaults:** Election A = 2024 President, Election B = 2020 President.
2. **Diff computation:** `diffMargin = A.margin - B.margin`. Positive means ward shifted more Democratic in Election A.
3. **Diff color scale:** Purple-White-Orange (distinct from RdBu to avoid confusion). Purple = shifted more Republican, Orange = shifted more Democratic. Range: -20 to +20 points.
4. **Viewport sync:** Both maps share a `syncedView` state. Moving either map calls `onMove` which updates the shared state. The other map responds via `viewState` prop. `isSyncing` ref prevents infinite loops.
5. **Ward click:** Currently no-op (`handleWardClickA/B = useCallback(() => {}, [])`). No detail panel in comparison mode.
6. **Loading state:** Shows loading indicators while either dataset is being fetched.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Same election selected for A and B | Diff map shows all white (no change) |
| Ward exists in A but not B | Ward shows no diff color (gray) |
| Different ward vintages between elections | Wards with ID mismatches show no data |
| Large margin shifts (> 20 points) | Color clamped at max purple/orange |

---

## Files

| File | Purpose |
|------|---------|
| `features/election-comparison/index.tsx` | Page component — top bar + side-by-side or diff view |
| `features/election-comparison/components/ComparisonSelector.tsx` | Year + race dropdown pair |
| `features/election-comparison/components/DifferenceMap.tsx` | Single map with diff choropleth |
| `features/election-comparison/hooks/useComparisonData.ts` | Fetches both elections, computes diff |
| `shared/lib/diffColorScale.ts` | Purple-orange diff scale + MapLibre paint expression |
