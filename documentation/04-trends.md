# 04 — Trends

> Partisan trend analysis: time series charts, trend classification, area aggregation, and trend map.

**Route:** `/trends`

---

## Data Model

### Ward Trend

| Field | Type | Description |
|-------|------|-------------|
| `ward_id` | `string` | LTSB identifier |
| `race_type` | `string` | e.g., "president" |
| `trend_direction` | `string` | `more_democratic`, `more_republican`, `inconclusive` |
| `trend_slope` | `number` | Linear regression slope (margin change per election cycle) |
| `trend_r_squared` | `number` | R-squared of the linear fit |
| `trend_p_value` | `number` | Statistical significance |
| `elections_analyzed` | `number` | Number of elections in the regression |
| `start_year` / `end_year` | `number` | Time range covered |

### Trend Classification (bulk)

| Field | Type | Description |
|-------|------|-------------|
| `race_type` | `string` | Requested race type |
| `ward_count` | `number` | Total wards classified |
| `classifications` | `Record<wardId, Classification>` | Per-ward: direction, slope, p_value, elections_analyzed |

### Area Trend

| Field | Type | Description |
|-------|------|-------------|
| `area_name` | `string` | County, municipality, or district name |
| `ward_count` | `number` | Wards in area |
| `trending_democratic` | `number` | Count trending D |
| `trending_republican` | `number` | Count trending R |
| `inconclusive` | `number` | Count inconclusive |
| `wards` | `array` | Individual ward trend records |

---

## API Endpoints

### `GET /api/v1/trends/ward/{ward_id}`

Returns trend data for a single ward (all race types).

### `GET /api/v1/trends/area?county=X&municipality=X&district_type=X&district_id=X`

Returns aggregated trends for an area with ward-level breakdowns.

### `POST /api/v1/trends/bulk-elections`

Body: `{ "ward_ids": ["..."] }` (max 500). Returns election histories for multiple wards.

### `GET /api/v1/trends/classify?race_type=president`

Bulk trend classification for all wards. Returns `Record<wardId, Classification>`.

**Cache:** 5 min TanStack Query stale time.

---

## Dashboard Elements

### Tab Bar

| Tab | Component | Description |
|-----|-----------|-------------|
| Ward Trends | Inline in index.tsx | Search for wards, view individual trend charts |
| Area Trends | Inline in index.tsx | County/district-level aggregated trends |
| Trend Map | `TrendMapOverlay` | Statewide map colored by trend classification |

### Ward Trends Tab

| Element | Type | Behavior |
|---------|------|----------|
| Ward search input | Text input | Filters wards by name/municipality |
| Race type selector | Dropdown | president, governor, us_senate, state_senate, state_assembly |
| Trend time series chart | `TrendTimeSeries` | Recharts line chart: D margin over time + regression trend line |
| Trend classification badge | `TrendClassificationBadge` | Color-coded: blue (Trending D), red (Trending R), gray (Inconclusive) |

### Area Trends Tab

| Element | Type | Behavior |
|---------|------|----------|
| Area type selector | Dropdown | County, congressional district, state senate, assembly |
| Area search input | Text input | Filters areas by name |
| Summary bar | `AreaTrendSummary` | Horizontal stacked bar: % Democratic / Republican / Inconclusive |
| Sparkline grid | `TrendSparklineGrid` | Mini sparklines for each ward in the selected area |

### Trend Map Tab

| Element | Type | Behavior |
|---------|------|----------|
| Wisconsin map | `WisconsinMap` with trend data | Wards colored by trend direction: blue=D, red=R, gray=inconclusive |
| Trend legend | `TrendLegend` | Ward counts by direction visible in viewport |
| Hover tooltip | `TrendHoverTooltip` | Ward name, classification, slope, elections analyzed, p-value |
| Summary dashboard | `TrendSummaryDashboard` | Viewport-scoped: stacked bar + average slopes + methodology |
| Info banner | `TrendInfoBanner` | Dismissible: explains linear regression methodology |

---

## Business Rules

1. **Trend classification:** Pre-computed via linear regression on D margin across available elections. `p_value < 0.05` → significant.
2. **Direction:** `slope > 0 && p < 0.05` → "more_democratic". `slope < 0 && p < 0.05` → "more_republican". Otherwise → "inconclusive".
3. **Map coloring:** Trend classifications are converted to fake `demPct` values for the WisconsinMap component: `more_democratic` → 65%, `more_republican` → 35%, `inconclusive` → 50%.
4. **Viewport-aware summary:** `onVisibleWardsChange` callback from WisconsinMap provides visible ward IDs. Summary counts only include wards in the current viewport.
5. **Sparkline rendering:** Uses real election histories (fetched via `useBulkWardElections`) when available. Falls back to slope-based synthetic sparklines.
6. **Sparkline pagination:** Configurable page size (default shows 50 wards per page). Sortable by ward ID, most Democratic, or most Republican.
7. **Trend Map is hardcoded to presidential:** `useTrendClassifications('president')` is called without UI to change race type. See audit item #50.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Ward has < 3 elections | Trend may be "inconclusive" due to insufficient data |
| Area with no wards | Empty sparkline grid |
| All wards in viewport inconclusive | Summary shows 100% gray bar |
| Bulk elections request > 500 wards | Server caps at 500 |
| Trend data loading | Skeleton placeholders |

---

## Files

| File | Purpose |
|------|---------|
| `features/trends/index.tsx` | Page component — 3-tab layout |
| `features/trends/components/TrendMapOverlay.tsx` | Map + hover + viewport summary |
| `features/trends/components/TrendTimeSeries.tsx` | Recharts line chart with regression line |
| `features/trends/components/TrendSparklineGrid.tsx` | Paginated grid of mini sparklines |
| `features/trends/components/AreaTrendSummary.tsx` | Stacked percentage bar |
| `features/trends/components/TrendClassificationBadge.tsx` | Color-coded trend badge |
| `features/trends/components/TrendInfoBanner.tsx` | Dismissible methodology explainer |
| `features/trends/components/TrendLegend.tsx` | Map legend with ward counts |
| `features/trends/components/TrendHoverTooltip.tsx` | Ward hover tooltip |
| `features/trends/components/TrendSummaryDashboard.tsx` | Viewport-scoped summary panel |
| `features/trends/hooks/useTrends.ts` | TanStack Query: `useWardTrend`, `useAreaTrends`, `useTrendClassifications` |
| `features/trends/hooks/useBulkWardElections.ts` | TanStack Query: bulk election history fetch |
