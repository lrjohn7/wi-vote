# 11 — Color Scales

> Choropleth color systems: RdBu partisan scale, purple-orange diff scale, and trend colors.

---

## Partisan Scale (RdBu)

**File:** `shared/lib/colorScale.ts`
**Library:** chroma-js

### Color Ramp

| Bin | Label | Color | Range (demPct) |
|-----|-------|-------|----------------|
| 1 | Strong R | `#b2182b` | 0–35% |
| 2 | Solid R | `#d6604d` | 35–42% |
| 3 | Lean R | `#f4a582` | 42–46% |
| 4 | Tilt R | `#fddbc7` | 46–48% |
| 5 | Even | `#f7f7f7` | 48–52% |
| 6 | Tilt D | `#d1e5f0` | 52–54% |
| 7 | Lean D | `#92c5de` | 54–58% |
| 8 | Solid D | `#4393c3` | 58–65% |
| 9 | Strong D | `#2166ac` | 65–100% |

**No data:** `#d4d4d4` (neutral gray)

### MapLibre Expressions

Two paint expressions are exported:

1. **`choroplethFillColor`** — Interpolates on `feature-state.demPct` (0–100 scale)
2. **`marginFillColor`** — Interpolates on `feature-state.margin` (-30 to +30 scale)

### Utility Functions

- `getColor(demPct)` — Returns hex color for a Democratic percentage value
- `getColorForMargin(margin)` — Converts margin to demPct equivalent, returns hex

### Legend Bins

Two sets of legend bins are exported:
- `DEM_PCT_LEGEND_BINS` — 9 bins for percentage view
- `MARGIN_LEGEND_BINS` — 9 bins for margin view (R+30 → Even → D+30)

---

## Difference Scale (Purple-Orange)

**File:** `shared/lib/diffColorScale.ts`
**Purpose:** Visualizes margin shift between two elections. Distinct from RdBu to avoid confusion.

### Color Ramp

| Bin | Label | Color | Range (diffMargin) |
|-----|-------|-------|---------------------|
| 1 | Strong R shift | `#7b3294` | -100 to -20 |
| 2 | Moderate R shift | `#c2a5cf` | -20 to -8 |
| 3 | Slight R shift | `#e6d8ef` | -8 to -2 |
| 4 | No change | `#f7f7f7` | -2 to +2 |
| 5 | Slight D shift | `#fee0b6` | +2 to +8 |
| 6 | Moderate D shift | `#fdb863` | +8 to +20 |
| 7 | Strong D shift | `#e66101` | +20 to +100 |

### MapLibre Expression

- **`diffChoroplethFillColor`** — Interpolates on `feature-state.diffMargin` (-20 to +20)

---

## Trend Colors

Used internally in trend components (not a separate color scale file):

| Classification | Color | Usage |
|----------------|-------|-------|
| Trending Democratic | Blue | Badge, sparkline, map overlay |
| Trending Republican | Red | Badge, sparkline, map overlay |
| Inconclusive | Gray | Badge, sparkline, map overlay |

Trend map converts classifications to fake `demPct` values for reuse of the standard choropleth: D → 65%, R → 35%, Inconclusive → 50%.

---

## Design Decisions

1. **ColorBrewer RdBu** chosen for colorblind accessibility and perceptual uniformity.
2. **Centered at 50%** (not at median) — ensures Even = white regardless of data distribution.
3. **9 bins** for sufficient granularity without overwhelming the legend.
4. **Separate diff palette** prevents users from confusing "shifted Republican" with "voted Republican."
5. **chroma-js** provides smooth interpolation between color stops.

---

## Files

| File | Purpose |
|------|---------|
| `shared/lib/colorScale.ts` | RdBu scale, MapLibre expressions, legend bins |
| `shared/lib/diffColorScale.ts` | Purple-orange diff scale + legend bins |
| `features/election-map/components/MapLegend.tsx` | Renders legend bins as colored swatches |
