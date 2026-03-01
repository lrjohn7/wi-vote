# 03 — Ward Report Card

> Personalized scorecard for any ward: partisan lean, trend, turnout, and comparison charts.

**Route:** `/wards/report` (landing) and `/wards/:wardId/report` (report view)

---

## Data Model

### Report Card Response

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `object` | Ward identity (name, municipality, county, districts, vintage, is_estimated) |
| `partisan_lean` | `object` | Score, label (e.g., "R+8.2"), elections_used, percentile |
| `trend` | `object` | Direction, slope, r_squared, p_value, is_significant, elections_analyzed, year range |
| `elections` | `array` | All election results sorted by year desc, then race type |
| `comparisons` | `array` | Ward vs county vs state margin for each election year |
| `turnout` | `array` | Total votes per election year for the selected race type |
| `has_estimates` | `boolean` | True if any election result is a population-weighted estimate |

### Partisan Lean

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number \| null` | Raw margin value (positive = D, negative = R) |
| `label` | `string` | Formatted: "D+5.3", "R+8.2", "Even", or "N/A" |
| `elections_used` | `number` | Count of presidential elections used (max 3) |
| `percentile` | `number \| null` | "More Dem. than X% of wards" |

### Trend

| Field | Type | Description |
|-------|------|-------------|
| `direction` | `string` | `more_democratic`, `more_republican`, or `inconclusive` |
| `slope` | `number \| null` | Margin change per election cycle |
| `p_value` | `number \| null` | Statistical significance |
| `is_significant` | `boolean` | `p_value < 0.05` |
| `elections_analyzed` | `number` | Number of elections in regression |
| `start_year` / `end_year` | `number \| null` | Time range |

---

## API Endpoints

### `GET /api/v1/wards/{ward_id}/report-card?race_type=president`

Returns full report card for a ward. Computes partisan lean percentile, fetches pre-computed trend data, and builds comparison arrays.

**Query params:** `race_type` (default: `president`) — filters trend and turnout data.

**Response:** See Report Card Response above.

**Error:** 404 if ward ID not found.

**Cache:** 10 min TanStack Query stale time (client-side).

**Server logic (ReportCardService):**
1. Loads ward with election_results via `selectinload` (latest vintage first).
2. Computes partisan lean from `ward.partisan_lean` column.
3. Queries `COUNT(*)` of wards with lower partisan lean for percentile.
4. Reads pre-computed `WardTrend` row for trend data.
5. Joins `ElectionAggregation` table for county + statewide comparison margins.
6. Filters turnout to requested race_type.

---

## Dashboard Elements

### Landing Page (no ward ID in URL)

| Element | Type | Behavior |
|---------|------|----------|
| "Find Your Ward" heading | `<h1>` | |
| Address lookup card | Card with input + "Find" button | Uses geocoding API, navigates to `/wards/{id}/report` on success |
| Ward name search card | Card with search input | Reuses `useWardSearch` from ward-explorer. Results list navigates on click |

### Report Card Header

| Element | Type | Behavior |
|---------|------|----------|
| Ward name | `<h1>` | e.g., "Mequon - C 0012" |
| Municipality, County | Subtitle | "Mequon, Ozaukee County" |
| District badges | Gray pills | CD-6, SD-8, AD-24 (only when non-null) |
| "Combined Reporting Unit" badge | Amber badge | Only when `is_estimated` is true |
| "View on Map" button | Button with map icon | Sets `selectedWardId` in mapStore, navigates to `/map` |
| "Share" button | Button with share icon | Copies current URL to clipboard via `navigator.clipboard` |

### Summary Cards (3-card grid)

| Card | Content | Details |
|------|---------|---------|
| Partisan Lean | Score (e.g., "R+8.2") colored red/blue + percentile | Elections used count. Color: blue if D+, red if R+ |
| Trend | Direction label + slope + significance | "Trending Democratic", "+1.18 margin pts/cycle", "p < 0.05" |
| Avg. Turnout | Mean total votes | Subtitle: "votes per presidential election" |

### Comparison Chart

| Element | Type | Behavior |
|---------|------|----------|
| Recharts LineChart | 3 lines: Ward (solid blue), County (dashed gray), State (dotted black) | X: election year, Y: margin. Custom tooltip with D+/R+ formatting |

### Turnout Chart

| Element | Type | Behavior |
|---------|------|----------|
| Recharts BarChart | Bars colored by winner | Blue bar if D won ward, red if R won. X: year, Y: total votes |

### Election History Table

| Element | Type | Behavior |
|---------|------|----------|
| Race type filter | Dropdown | "All", "President", "Governor", etc. |
| Table columns | Year, Race, DEM, REP, Total, Margin | Margin has mini bar visualization |
| Estimate marker | Asterisk | Shown next to estimated results |
| Responsive scroll | `overflow-x-auto` | Horizontal scroll on narrow screens |

### Estimate Disclosure

| Element | Type | Behavior |
|---------|------|----------|
| Footnote | Gray text at bottom | Conditionally shown when `has_estimates` is true. Explains population-weighted estimates |

---

## Business Rules

1. **Partisan lean:** Computed from `ward.partisan_lean` column (pre-computed, avg margin across recent presidential elections).
2. **Percentile:** Server counts all wards with lower partisan lean, divides by total wards with non-null lean. "More Dem. than X% of wards."
3. **Trend:** Read from `ward_trends` table — pre-computed linear regression on margin across available elections.
4. **Significance threshold:** `p_value < 0.05` for "Trending" classification. Otherwise "No Clear Trend."
5. **Comparison chart:** Only shows elections matching the selected `race_type` (default: president).
6. **Turnout card subtitle:** Says "votes per presidential election" but underlying computation uses the `race_type` parameter. See audit item #33.
7. **Share button:** Uses `navigator.clipboard.writeText(window.location.href)`.
8. **WardFinder reuse:** Landing page imports `useWardSearch` from `ward-explorer/hooks/`.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Invalid ward ID in URL | "Failed to load report card" error with ward ID displayed |
| Ward ID from wrong vintage | 404 from API — see audit item #87 |
| No presidential elections | Partisan lean shows "N/A", turnout card empty |
| No trend data | "No Clear Trend" with null slope |
| Ward has no elections at all | Empty election history table |
| Geocode fails | Error message in address card |
| Ward is estimated | Amber badge + footnote both shown |

---

## Files

| File | Purpose |
|------|---------|
| `features/ward-report/index.tsx` | Page component — landing vs report view based on URL params |
| `features/ward-report/components/WardFinder.tsx` | Landing page with address lookup + ward search |
| `features/ward-report/components/ReportCardHeader.tsx` | Ward name, districts, share/map buttons |
| `features/ward-report/components/PartisanLeanCard.tsx` | Score + percentile card |
| `features/ward-report/components/TrendCard.tsx` | Trend direction + slope + significance |
| `features/ward-report/components/TurnoutChart.tsx` | Recharts bar chart of turnout by year |
| `features/ward-report/components/ComparisonChart.tsx` | Recharts line chart: ward vs county vs state |
| `features/ward-report/components/ElectionHistoryTable.tsx` | Filterable election results table |
| `features/ward-report/hooks/useReportCard.ts` | TanStack Query: `GET /wards/{id}/report-card` (10 min stale time) |
| `services/api.ts` | `getWardReportCard(wardId, raceType)` function |
| `server/services/report_card_service.py` | Backend: builds full report card from ward + trends + aggregations |
