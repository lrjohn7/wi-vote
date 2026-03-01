# 01 — Election Map

> Statewide ward-level choropleth map with election year/race switching and ward detail panel.

**Route:** `/map`
**URL params:** `?year=2024&race=president&ward=55089511500012`

---

## Data Model

### Map Data (compact format for `setFeatureState`)

| Field | Type | Description |
|-------|------|-------------|
| `demPct` | `number` | Democratic percentage of total votes |
| `repPct` | `number` | Republican percentage of total votes |
| `margin` | `number` | `(dem - rep) / total * 100`. Positive = D, negative = R |
| `totalVotes` | `number` | Total votes cast in ward |
| `demVotes` | `number` | Democratic votes |
| `repVotes` | `number` | Republican votes |
| `isEstimate` | `boolean` | True if from disaggregated multi-ward reporting unit |

**Shape:** `Record<wardId, WardMapEntry>` — flat dictionary keyed by LTSB ward ID (e.g., `55089511500012`)

### Ward Detail (full record)

| Field | Type | Notes |
|-------|------|-------|
| `ward_id` | `string` | LTSB identifier |
| `ward_name` | `string` | e.g., "Mequon - C 0012" |
| `municipality` | `string` | e.g., "Mequon" |
| `municipality_type` | `string \| null` | city, village, town |
| `county` | `string` | e.g., "Ozaukee" |
| `congressional_district` | `string \| null` | e.g., "6" |
| `state_senate_district` | `string \| null` | e.g., "8" |
| `assembly_district` | `string \| null` | e.g., "24" |
| `ward_vintage` | `number` | 2020, 2022, or 2025 |
| `area_sq_miles` | `number \| null` | |
| `is_estimated` | `boolean` | True if combined reporting unit |
| `elections` | `WardDetailElection[]` | All election results for this ward |

### Election Result (per ward per race)

| Field | Type | Notes |
|-------|------|-------|
| `election_year` | `number` | |
| `race_type` | `string` | president, governor, us_senate, us_house, state_senate, state_assembly |
| `dem_votes` | `number` | |
| `rep_votes` | `number` | |
| `other_votes` | `number` | |
| `total_votes` | `number` | |
| `dem_pct` | `number` | Computed |
| `rep_pct` | `number` | Computed |
| `margin` | `number` | Positive = D, negative = R |
| `is_estimate` | `boolean` | |

---

## API Endpoints

### `GET /api/v1/elections`

Returns all available year + race type combinations.

**Response:**
```json
{
  "elections": [
    { "year": 2024, "race_type": "president", "ward_count": 6819 },
    { "year": 2024, "race_type": "us_senate", "ward_count": 6819 }
  ]
}
```

**Cache:** 1 hour server-side. 5 min TanStack Query stale time.

### `GET /api/v1/elections/map-data/{year}/{race_type}`

Returns compact ward results for map rendering via `setFeatureState`.

**Response:**
```json
{
  "year": 2024,
  "raceType": "president",
  "wardCount": 6819,
  "data": {
    "55089511500012": { "demPct": 46.0, "repPct": 52.0, "margin": -6.0, "totalVotes": 1037, "demVotes": 477, "repVotes": 539, "isEstimate": false }
  }
}
```

**Cache:** 24 hours server-side. 5 min TanStack Query stale time.

### `GET /api/v1/wards/{ward_id}`

Returns full ward metadata + all election results.

**Response:** `WardDetail` object (see data model above).

**Error:** 404 if ward ID not found.

**Cache:** 5 min TanStack Query stale time.

---

## Dashboard Elements

### Top Bar

| Element | Type | Behavior |
|---------|------|----------|
| Year dropdown | `<Select>` (shadcn) | 100px wide. Options from `/elections` endpoint, sorted descending. Changing year auto-selects first available race for that year |
| Race dropdown | `<Select>` (shadcn) | 160px wide. Options filtered to selected year. Race labels: `RACE_LABELS` map provides human names |
| Ward count | Static text | Shows `{n} wards` from map data response |
| Loading indicator | Amber pulsing dot | Visible while `mapData` is loading |

### Map (WisconsinMap shared component)

| Element | Behavior |
|---------|----------|
| Ward polygons | Filled with diverging RdBu color scale (R+30 to D+30). Color driven by `margin` feature state |
| Ward click | Opens detail panel. Toggle behavior — clicking same ward deselects |
| Ward hover | Shows floating tooltip at cursor position with ward name, municipality, county, DEM/REP %, margin, total votes |
| Zoom +/- buttons | MapLibre NavigationControl |
| Compass rose | Reset north button |

### Map Legend (bottom-left)

| Element | Behavior |
|---------|----------|
| Color gradient | 9 bins from `MARGIN_LEGEND_BINS`: R+30 → Even → D+30 |
| "No data" swatch | Gray circle for wards with no election data |
| Glass panel style | Semi-transparent with backdrop blur |

### Ward Detail Panel (right sidebar)

| Element | Type | Behavior |
|---------|------|----------|
| Close button | X icon | `setSelectedWard(null)` — collapses panel |
| Ward name | `<h3>` | e.g., "Mequon - C 0012" |
| Municipality, County | Text | e.g., "Mequon, Ozaukee County" |
| Estimated badge | Amber badge | Only shown when `is_estimated` is true |
| District badges | CD-6, SD-8, AD-24 | Only rendered when value is non-null |
| Report Card button | Button | Navigates to `/wards/{ward_id}/report` |
| Election history list | Scrollable list | Each entry: year, race, two-party bar, margin label, DEM/REP votes |
| Footnote | Text | Shown when `is_estimated`: explains population-weighted estimates |

### Ward Tooltip (floating)

| Element | Notes |
|---------|-------|
| Position | Fixed at `left: x+12, top: y+12`, pointer-events-none |
| Left border | Blue for D+, red for R+, gray for no data |
| Content | Ward name, municipality/county, DEM%, REP%, margin, total votes |
| Estimate warning | Amber text when `isEstimate` is true |

---

## Business Rules

1. **Two-party bar calculation:** `demVotes / (demVotes + repVotes) * 100`. Third-party votes excluded from bar proportions but included in total vote count.
2. **Margin formatting:** `margin > 0` → `D+{n}`, `margin < 0` → `R+{n}`, `margin === 0` → `"Even"`.
3. **Color:** Positive margin → blue (`#2166ac`), negative → red (`#b2182b`).
4. **Election switching:** Uses `setFeatureState` for sub-100ms updates — geometry stays on GPU, only numeric values are swapped.
5. **Year change auto-selects first race:** Prevents invalid year+race combinations.
6. **Estimated data disclosure is mandatory:** Any ward from a combined reporting unit must show the amber badge and footnote.
7. **Ward click toggles:** Clicking the already-selected ward deselects it.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Ward has no data for selected election | Gray fill (`#cccccc`), tooltip shows only ward name (no stats) |
| `activeElection` is null | Map renders with no coloring; no API call fired |
| Ward ID in URL but ward not found | Detail panel shows "Ward not found" text |
| Elections endpoint loading | "Loading elections..." text replaces dropdowns |
| Map data loading | Amber pulsing dot + "Loading data" text |
| Ward has no elections at all | Detail panel shows "No election data available" |
| Panel animation | `slide-in-from-right-full duration-300` CSS animation |

---

## Files

| File | Purpose |
|------|---------|
| `features/election-map/index.tsx` | Page component — composes map + selectors + panel |
| `features/election-map/components/ElectionSelector.tsx` | Year + race dropdowns |
| `features/election-map/components/WardDetailPanel.tsx` | Right sidebar with ward info + election history |
| `features/election-map/components/WardTooltip.tsx` | Floating hover tooltip (React.memo) |
| `features/election-map/components/MapLegend.tsx` | Color legend (React.memo) |
| `features/election-map/hooks/useElections.ts` | TanStack Query: `GET /elections` |
| `features/election-map/hooks/useMapData.ts` | TanStack Query: `GET /elections/map-data/{year}/{race}` |
| `features/election-map/hooks/useWardDetail.ts` | TanStack Query: `GET /wards/{id}` (shared with Ward Explorer) |
| `shared/components/WisconsinMap.tsx` | Reusable MapLibre + PMTiles choropleth component |
| `shared/lib/colorScale.ts` | chroma-js RdBu palette, legend bins, MapLibre paint expressions |
| `stores/mapStore.ts` | Zustand: activeElection, selectedWardId, hoveredWardId, displayMetric |
