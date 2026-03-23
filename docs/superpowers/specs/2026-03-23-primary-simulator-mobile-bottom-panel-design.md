# Primary Simulator: Mobile Bottom Panel Redesign

## Context

The Primary Simulator's mobile UX has two problems:

1. **Discoverability:** The only way to access candidate controls is a small 48px circle FAB button in the bottom-left corner. Users landing on the page see a full-screen map with no obvious interactive elements — they don't know what to do or how to use the simulator.

2. **Space efficiency:** When the drawer does open, full candidate names ("Mandela Barnes", "Francesca Hong") and their percentages take up significant vertical space, leaving less room for the actual controls (sliders, polls, scenarios).

## Design: Persistent Bottom Panel

Replace the FAB + left-drawer pattern with a **persistent bottom panel** that is always visible on mobile (`< md` breakpoint). Desktop layout is unchanged.

### Panel States

#### Collapsed (default, ~130px height)
- **Drag handle** at top (36px wide, 4px tall, centered gray pill)
- **Top 4 candidates** by polling percentage, displayed as compact rows:
  - `[color dot 8px] [Last name only] .............. [XX%]`
  - Sorted descending by `pollingBaseline`
  - Inactive candidates shown muted with strikethrough (same as current)
- **"+N more" line** if more than 4 candidates
- **CTA text:** "Expand to build your own scenario" in accent color with up arrow
- Tap the CTA or drag up to expand

#### Expanded (~65vh, scrollable)
- Same drag handle
- **All candidates** with last names, percentages, and chevron to expand individual candidate sliders (same expand/collapse as current `CandidateCard` but using `shortName` instead of `name`)
- **Active toggle checkbox** visible per candidate
- **Global Controls** section (turnout slider, competitiveness slider)
- **Factor Weights** section (geography, ideology, demographics, endorsements)
- **Tabbed section:** Polls | Scenarios | Results (reusing `PollManager` and `PrimaryResultsSummary`)
- **Win Probability Bars** at the bottom
- **Reset button**
- Scrollable within the panel (panel height capped at 65vh, content scrolls)

#### Gestures & Interactions
- **Tap CTA** or **tap drag handle**: toggle between collapsed ↔ expanded
- **Drag up/down** on the handle: smooth transition (CSS transform, no snap library needed for MVP — just collapsed/expanded toggle)
- **Tap outside panel** (on map): collapse if expanded
- **Escape key**: collapse if expanded
- Transition: `transition-transform duration-300 ease-out`

### Candidate Display Changes (Mobile Only)

- Use `candidate.shortName` (last name) instead of `candidate.name` (full name) in both collapsed and expanded states
- The `shortName` field already exists on every candidate in `primaryStore.ts`
- Desktop sidebar continues using full names

### What Gets Removed (Mobile Only)

- The FAB circle button (`bottom-20 left-4 z-30 h-12 w-12`)
- The left-sliding drawer (`fixed inset-y-0 left-0 z-50 w-[85vw]`)
- The drawer overlay (`fixed inset-0 z-40 bg-black/40`)
- The "Primary Controls" header bar with X close button
- The `PrimaryGuide` component in mobile (the CTA text replaces its role as onboarding hint)

### What Stays the Same

- Desktop sidebar layout (320px, `hidden md:flex`)
- All control components internally (`PrimaryControlsPanel`, `PollManager`, `PrimaryResultsSummary`, `WinProbabilityBars`)
- `CandidateCard` internal expand/collapse with all sliders
- Store, worker, map — no changes
- Top bar with title, ward count, map mode toggle

## Files to Modify

| File | Change |
|------|--------|
| `packages/client/src/features/primary-simulator/index.tsx` | Replace mobile FAB + drawer with bottom panel component; remove `mobileDrawerOpen` state for the drawer (replace with `panelExpanded` or similar); keep desktop sidebar unchanged |
| `packages/client/src/features/primary-simulator/components/MobileBottomPanel.tsx` | **New file.** Encapsulates the bottom panel: collapsed/expanded states, drag handle, candidate summary rows, CTA, expanded content (candidates + controls + results) |
| `packages/client/src/features/primary-simulator/components/CandidateCard.tsx` | Accept optional `useShortName?: boolean` prop; when true, render `candidate.shortName` instead of `candidate.name` |
| `packages/client/src/features/primary-simulator/components/CandidateCardList.tsx` | Pass `useShortName` prop through to `CandidateCard` |

## Component: `MobileBottomPanel`

```
Props: none (reads from primaryStore via Zustand)

Internal state:
  - expanded: boolean (default false)

Rendered structure:
  <div className="fixed bottom-0 inset-x-0 z-30 md:hidden">
    <!-- Panel container with rounded top corners, bg-content1, border-top -->
    <div style={{ transform: expanded ? 'translateY(0)' : ... }}>

      <!-- Drag handle (always visible) -->

      {!expanded && (
        <!-- Collapsed: top 4 candidates + CTA -->
      )}

      {expanded && (
        <!-- Expanded: scrollable container max-h-[65vh] -->
        <CandidateCardList useShortName />
        <PrimaryControlsPanel />
        <PrimaryResultsSummary />
        <WinProbabilityBars />
      )}
    </div>
  </div>
```

## Verification

1. **Mobile (375px):** Panel visible at bottom. Top 4 candidates shown with last names and %. CTA text visible. Tap CTA → panel expands to ~65vh. All controls accessible. Tap map → collapses. Escape → collapses.
2. **Desktop (1280px+):** No change. Sidebar renders as before. Bottom panel not rendered.
3. **Tablet (768px):** At `md` breakpoint, bottom panel disappears and desktop sidebar appears. No overlap.
4. **Content completeness:** Expanded panel contains all the same content as the old drawer (candidates, controls, polls, scenarios, results, win probability).
5. **TypeScript:** `tsc -b` passes.
6. **Build:** `vite build` succeeds.
7. **Dark mode:** Panel respects theme tokens (`bg-content1`, `border-border/30`, etc.).
