# 22 -- Primary Simulator

> Multi-candidate primary election simulator with demographic-aware vote modeling, Monte Carlo win probabilities, and ward-level choropleth maps.

**Route:** `/primary`

---

## Data Model

### Candidate

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique candidate identifier |
| `name` | `string` | Full display name |
| `shortName` | `string` | Abbreviated name (used in mobile bottom panel) |
| `color` | `string` | Candidate brand color for map/charts |
| `isActive` | `boolean` | Whether candidate is still in the race (dropout toggle) |
| `pollingBaseline` | `number` | Current polling percentage (adjustable) |
| `geographicBase` | `string` | Geographic strength region |
| `ideology` | `number` | Ideology slider value |
| `endorsementStrength` | `number` | Endorsement modifier |

### Primary Ward Data

Built from general election ward data + demographics. Key fields:
- `wardId`, `county`, `centroidLng`, `centroidLat`
- Demographics: `blackPct`, `hispanicPct`, `collegePct`, `medianIncome`, `populationDensity`, `urbanRuralClass`
- `votingAgePopulation` (estimated from 2024 general turnout / 0.72 rate)
- `partisanLean` (from historical presidential margins)

---

## Architecture

### Web Worker (`primary.worker.ts`)

All prediction and Monte Carlo simulation runs in a dedicated Web Worker to keep the UI at 60fps. The worker receives candidate parameters + ward data, runs the demographic-aware primary model, and returns per-ward predictions plus statewide Monte Carlo win probabilities.

### Stores (`primaryStore`)

Zustand store holds candidates, global parameters, predictions, statewide totals, Monte Carlo results, map mode, poll source, and computing state. URL state is synced bidirectionally via `usePrimaryUrlState`.

### Poll Averaging

EWMA (Exponentially Weighted Moving Average) engine in `pollAveraging.ts`. Supports built-in polls, user-added polls, and pre-built poll presets. When `pollSource === 'average'`, candidate baselines reflect the EWMA-weighted poll data rather than hardcoded defaults.

---

## Layout

### Desktop (md+ breakpoint)

Standard sidebar + map layout:
- **Left sidebar** (`w-80`, `hidden md:flex`): `CandidateCardList`, `PrimaryControlsPanel`, `PrimaryResultsSummary`, `WinProbabilityBars`
- **Main area**: `PrimaryMap` (MapLibre choropleth), `PrimaryMapLegend`, `PrimaryTooltip` (hover, `hidden md:block`)

### Mobile (< md breakpoint)

Persistent bottom panel replaces the desktop sidebar:
- **Map**: Full viewport with `setPadding({ bottom: 140 })` to offset map center above the collapsed panel
- **`MobileBottomPanel`**: Fixed at bottom, always visible (`md:hidden`)
- **`PrimaryMapLegend`**: Repositioned to `bottom-36` (above panel) vs `bottom-2` on desktop
- **`PrimaryTooltip`**: Hidden on mobile (`hidden md:block`)

---

## MobileBottomPanel Component

**File:** `features/primary-simulator/components/MobileBottomPanel.tsx`

Replaces the previous FAB circle button + left-sliding drawer pattern for better discoverability and persistent context.

### Collapsed State (~160px)

| Element | Description |
|---------|-------------|
| Drag handle | Centered pill, toggles expanded/collapsed |
| Top 4 candidates | Sorted by polling baseline descending. Shows color dot + short name + polling %. Inactive candidates at 50% opacity with strikethrough |
| "+N more" | Count of remaining candidates beyond top 4 |
| CTA button | "Try pre-built scenarios or create your own" with ChevronUp icon |

### Expanded State (~65vh)

| Element | Description |
|---------|-------------|
| Drag handle | Same toggle button |
| `CandidateCardList` | Full candidate cards with `useShortName` prop for compact display |
| `PrimaryControlsPanel` | Global controls (turnout, poll source, scenarios) |
| `PrimaryResultsSummary` | Statewide results table |
| `WinProbabilityBars` | Monte Carlo win probability visualization |
| Collapse button | "Collapse" with ChevronDown at bottom of scroll area |

### Behavior

- **Overlay**: When expanded, a transparent overlay covers the map; tapping it collapses the panel
- **Escape key**: Collapses the panel when expanded
- **Scroll containment**: `overscroll-behavior-y: contain` prevents mobile Safari from scrolling the page behind the panel
- **iOS safe area**: `pb-[env(safe-area-inset-bottom)]` in both collapsed and expanded states (requires `viewport-fit=cover` in `<meta>` tag)
- **Memoized**: Wrapped in `React.memo` to prevent re-renders from parent state changes

---

## Dashboard Elements

### Map Mode Toggle

| Mode | Description |
|------|-------------|
| Winner | Each ward colored by projected primary winner |
| Heatmap | Single-candidate vote share heatmap (select candidate) |

### Controls Panel

| Element | Description |
|---------|-------------|
| Poll source toggle | Built-in polls vs EWMA poll average |
| Poll manager | Add/remove polls, view poll table and trend chart |
| Poll presets | Pre-built scenario selector |
| Dropout toggles | Remove candidates from simulation |
| Guide | Expandable methodology explainer |

---

## Business Rules

1. **Candidate short names**: `CandidateCard` and `CandidateCardList` accept a `useShortName` prop. Mobile bottom panel uses short names; desktop sidebar uses full names.
2. **Top 4 in collapsed**: Only the top 4 candidates by polling baseline appear in the collapsed bottom panel. The rest are indicated by a "+N more" count.
3. **Map padding on mobile**: `PrimaryMap` calls `setPadding({ bottom: 140 })` when viewport width < 768px so the map center is not obscured by the bottom panel.
4. **Legend positioning**: `PrimaryMapLegend` uses `bottom-36 left-2` on mobile (above bottom panel) and `bottom-2` on desktop via responsive Tailwind classes.
5. **Poll average on mount**: When `pollSource === 'average'`, `applyPollAverage()` is called on mount so baselines reflect EWMA data immediately.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| All candidates dropped out | Model returns zero predictions, results panel shows no winner |
| Demographics not loaded yet | Worker uses fallback defaults (0% minority, rural, median income 67k) |
| Single active candidate | That candidate wins every ward with 100% |
| Mobile orientation change | Bottom panel max-height stays at 65vh, map resizes via MapLibre `resize()` |
| No ward data loaded | Loading skeleton shown, worker not invoked |

---

## Files

| File | Purpose |
|------|---------|
| `features/primary-simulator/index.tsx` | Page component -- desktop sidebar + map + mobile panel |
| `features/primary-simulator/components/MobileBottomPanel.tsx` | Mobile persistent bottom panel (collapsed/expanded) |
| `features/primary-simulator/components/CandidateCard.tsx` | Individual candidate card with sliders, dropout toggle |
| `features/primary-simulator/components/CandidateCardList.tsx` | Renders all candidate cards, accepts `useShortName` |
| `features/primary-simulator/components/PrimaryControlsPanel.tsx` | Global controls (turnout, polls, scenarios) |
| `features/primary-simulator/components/PrimaryResultsSummary.tsx` | Statewide results summary |
| `features/primary-simulator/components/WinProbabilityBars.tsx` | Monte Carlo win probability bars |
| `features/primary-simulator/components/PrimaryMap.tsx` | MapLibre choropleth with mobile padding |
| `features/primary-simulator/components/PrimaryMapLegend.tsx` | Map legend (repositioned on mobile) |
| `features/primary-simulator/components/PrimaryTooltip.tsx` | Hover tooltip (desktop only) |
| `features/primary-simulator/components/PrimaryGuide.tsx` | Methodology explainer |
| `features/primary-simulator/components/PollManager.tsx` | Poll add/remove/table UI |
| `features/primary-simulator/components/PollAverageSummary.tsx` | EWMA poll average display |
| `features/primary-simulator/components/PollAveragingConfig.tsx` | EWMA configuration |
| `features/primary-simulator/components/PollPresetSelector.tsx` | Pre-built poll scenario selector |
| `features/primary-simulator/components/PollTable.tsx` | Poll data table |
| `features/primary-simulator/components/PollTrendChart.tsx` | Poll trend line chart |
| `features/primary-simulator/components/AddPollForm.tsx` | Form to add custom polls |
| `features/primary-simulator/components/DropoutToggle.tsx` | Candidate dropout toggle |
| `features/primary-simulator/primary.worker.ts` | Web Worker for predictions + Monte Carlo |
| `features/primary-simulator/hooks/usePrimaryData.ts` | TanStack Query: ward data + demographics |
| `features/primary-simulator/hooks/usePrimaryUrlState.ts` | Bidirectional URL state sync |
| `features/primary-simulator/lib/candidates.ts` | Candidate definitions and defaults |
| `features/primary-simulator/lib/primaryModel.ts` | Demographic-aware primary vote model |
| `features/primary-simulator/lib/primaryColors.ts` | Candidate color palette |
| `features/primary-simulator/lib/primaryAggregations.ts` | County/district/statewide aggregation |
| `features/primary-simulator/lib/pollAveraging.ts` | EWMA poll averaging engine |
| `features/primary-simulator/lib/builtInPolls.ts` | Hardcoded poll data |
| `features/primary-simulator/lib/pollPresets.ts` | Pre-built scenario poll sets |
| `stores/primaryStore.ts` | Zustand store for primary simulator state |
