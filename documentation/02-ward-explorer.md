# 02 — Ward Explorer

> Search for wards by name, municipality, county, or address. View full election history for any ward.

**Route:** `/wards`

---

## Data Model

### Search Result

| Field | Type | Description |
|-------|------|-------------|
| `ward_id` | `string` | LTSB identifier |
| `ward_name` | `string` | e.g., "Bayside - V 0001" |
| `municipality` | `string` | e.g., "Bayside" |
| `county` | `string` | e.g., "Milwaukee" |
| `congressional_district` | `string \| null` | |
| `state_senate_district` | `string \| null` | |
| `assembly_district` | `string \| null` | |
| `ward_vintage` | `number` | 2020, 2022, or 2025 |

### Geocode Response

| Field | Type | Description |
|-------|------|-------------|
| `ward` | `object \| null` | Ward record if found |
| `address` | `object` | Matched address details |
| `coordinates` | `{ lat, lng }` | Geocoded point |

---

## API Endpoints

### `GET /api/v1/wards/search?q={query}&limit=50`

Full-text search on ward name, municipality, county.

**Validation:** `q` must be >= 2 characters (422 error otherwise).

**Response:**
```json
{
  "results": [
    { "ward_id": "55079000100001", "ward_name": "Bayside - V 0001", "municipality": "Bayside", "county": "Milwaukee", "ward_vintage": 2025 }
  ],
  "query": "Milwaukee",
  "count": 50
}
```

**Cache:** 30s TanStack Query stale time.

**Known issue:** Returns results across all 3 ward vintages. Each physical ward appears up to 3 times. See audit report item #86.

### `GET /api/v1/wards/geocode?address={encoded}&lat=0&lng=0`

Geocodes a Wisconsin address and returns the containing ward via PostGIS `ST_Contains`.

**Error cases:**
- 400: Address is not in Wisconsin
- 404: No ward found at geocoded coordinates
- 422: Missing required parameters
- 500: Census geocoder unavailable

**Response:**
```json
{
  "ward": { "ward_id": "...", "ward_name": "...", ... },
  "coordinates": { "lat": 43.07, "lng": -89.40 }
}
```

### `GET /api/v1/wards/{ward_id}`

Full ward detail with all election results. (Same endpoint used by Election Map detail panel.)

---

## Dashboard Elements

### Left Panel (384px fixed width)

| Element | Type | Behavior |
|---------|------|----------|
| Ward search input | `<input>` with magnifying glass icon | 300ms debounce via `useEffect` + `setTimeout`. Minimum 2 chars |
| "Or look up by address" label | Text | |
| Address input | `<input>` | Placeholder: "123 Main St, Madison, WI" |
| "Find" button | `<button>` | Disabled when empty or during geocoding. Triggers `handleGeocodeAddress` |
| Search results list | Scrollable list of buttons | Shows `{n} results for "{query}"`. Each item: ward name + municipality + county |
| Help text | Gray text | "Search for a ward by name, municipality, or county to get started." (when no query) |

### Right Panel (flex-1)

| Element | Type | Behavior |
|---------|------|----------|
| Empty state | Centered icon + text | "Select a ward to view details" with magnifying glass icon |
| Loading state | Animated skeleton | 4-card grid placeholder |
| Ward header | `<h2>` | Ward name (e.g., "Bayside - V 0001") |
| Municipality, County | Subtitle text | |
| Estimated badge | Amber badge | "Combined Reporting Unit" when `is_estimated` |
| District badges | Gray pills | CD-4, SD-8, AD-23 |
| "Report Card" button | Button with clipboard icon | Navigates to `/wards/{id}/report` |
| "View on Map" button | Button with pin icon | Sets `selectedWardId` in mapStore, navigates to `/map` |
| Election history grid | 2-column responsive grid | Cards with year, race, two-party bar, DEM/REP votes/%, margin |
| Estimate footnote | Text | Disclosure when `is_estimated` is true |

---

## Business Rules

1. **Search minimum:** 2 characters required. Below that, `useWardSearch` is disabled.
2. **Debounce:** 300ms delay after last keystroke before firing search API call.
3. **Result limit:** Server hard limit of 50 results per search request.
4. **Geocoding flow:** Address → Census Geocoder → lat/lng → PostGIS `ST_Contains` → ward ID.
5. **Wisconsin validation:** Geocoded coordinates are checked to be within Wisconsin boundaries. Non-WI addresses return HTTP 400.
6. **Two-party bar:** Same formula as Election Map: `dem_votes / (dem_votes + rep_votes) * 100`.
7. **Estimated data disclosure:** Amber badge + footnote (mandatory per CLAUDE.md).
8. **Clicking "View on Map":** Pre-selects the ward in the mapStore before navigating, so the map opens with the detail panel already visible.
9. **Shared hooks:** `useWardDetail` is imported from `election-map/hooks/` (cross-feature dependency). `useWardSearch` is defined here and also imported by `ward-report/WardFinder.tsx`.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Query < 2 chars | No API call; shows help text |
| No search results | "No wards found for '{query}'" |
| Geocode HTTP 400 | "This address is not in Wisconsin." |
| Geocode other errors | "Address not found" or "Geocoding failed" |
| Geocode success but no ward | "No ward found at that address." |
| Ward detail loading | 4-card animated skeleton grid |
| Ward has no elections | "No election data available." |
| "Find" button during geocoding | Disabled, prevents double-submit |

---

## Files

| File | Purpose |
|------|---------|
| `features/ward-explorer/index.tsx` | Page component — two-column layout with search + detail |
| `features/ward-explorer/components/WardSearchBox.tsx` | Search input with 300ms debounce |
| `features/ward-explorer/hooks/useWardSearch.ts` | TanStack Query: `GET /wards/search` |
| `features/election-map/hooks/useWardDetail.ts` | TanStack Query: `GET /wards/{id}` (shared) |
| `services/api.ts` | Geocode call via `fetch` in index.tsx (not via TanStack Query) |
