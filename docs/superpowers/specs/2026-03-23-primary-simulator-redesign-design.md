# Primary Simulator Redesign — Design Spec

## Context

The Primary Simulator (`/primary`) is the app's flagship interactive feature, but the current sidebar layout buries the simulator controls below a dismissible guide panel. Polling data (which most users don't need to tweak) shares equal prominence with scenario presets. The nav label ("Primary") is ambiguous. During review, a significant model divergence bug was discovered between `primaryModel.ts` and `primary.worker.ts`.

**Goals:**
- Make simulator controls (candidates + scenarios) the first thing users see
- Demote polling to a secondary tab behind scenarios
- Fix nav label for clarity
- Consolidate duplicated model code to eliminate drift bugs
- Default to scenario mode so users start with an interactive pre-built scenario

---

## Changes

### 1. Sidebar Layout Reorder

**File:** `packages/client/src/features/primary-simulator/index.tsx`

Current desktop sidebar order:
1. PrimaryGuide (dismissible)
2. CandidateCardList
3. PrimaryControlsPanel (contains PollManager + global sliders + reset)
4. PrimaryResultsSummary
5. WinProbabilityBars

New order:
1. CandidateCardList
2. PollManager (extracted, tabs swapped: Scenarios default)
3. Global Sliders section (extracted from PrimaryControlsPanel)
4. Factor Weights section
5. Reset button
6. PrimaryResultsSummary
7. WinProbabilityBars

**Key change:** `PrimaryControlsPanel` currently wraps PollManager + global sliders + reset. We restructure it so PollManager renders directly in the sidebar (before global sliders), and the global sliders/weights/reset render separately below it.

### 2. Remove PrimaryGuide

**Files:**
- Delete: `packages/client/src/features/primary-simulator/components/PrimaryGuide.tsx`
- Edit: `packages/client/src/features/primary-simulator/index.tsx` — remove import and `<PrimaryGuide />` from sidebar

**Verified:** `PrimaryGuide` is only imported in `index.tsx` (line 14). No other consumers.

### 3. Swap PollManager Tab Order + Default

**File:** `packages/client/src/features/primary-simulator/components/PollManager.tsx`

Change `TABS` array from:
```
[{ id: 'average', label: 'Polls' }, { id: 'scenario', label: 'Scenarios' }]
```
To:
```
[{ id: 'scenario', label: 'Scenarios' }, { id: 'average', label: 'Polling' }]
```

### 4. Default pollSource to 'scenario'

**File:** `packages/client/src/stores/primaryStore.ts`

- Change `pollSource: 'average'` → `pollSource: 'scenario'` in store defaults
- Change `activePresetId: 'custom'` → `activePresetId: 'even-field'` (first preset from `pollPresets.ts`)
- Update `DEFAULT_CANDIDATES` baselines to match the "Even Field" preset (all 12.5%) so that the default state is internally consistent
- In `resetToDefaults`: use the updated `DEFAULT_CANDIDATES` with Even Field baselines, `pollSource: 'scenario'`, `activePresetId: 'even-field'`

**File:** `packages/client/src/features/primary-simulator/index.tsx`

- Update the mount `useEffect`: when `pollSource === 'scenario'` AND no URL state was restored by `usePrimaryUrlState()`, apply the default scenario preset. When `pollSource === 'average'`, call `applyPollAverage()` as before.
- **URL state precedence:** URL params always take priority over defaults. If a user navigates to `/primary?pollSource=average&...`, the mount effect must respect that and not override with the default scenario. To implement: `usePrimaryUrlState()` should return a flag indicating whether URL state was restored, and the mount effect checks this flag.

### 5. Navigation Label Update

**File:** `packages/client/src/App.tsx`

Change:
```
{ to: '/primary', label: 'Primary', icon: Vote, end: false }
```
To:
```
{ to: '/primary', label: 'Primary Simulator', icon: Vote, end: false }
```

### 6. Mobile Bottom Panel Update

**File:** `packages/client/src/features/primary-simulator/components/MobileBottomPanel.tsx`

- Update CTA text from "Try pre-built scenarios or create your own" to "Adjust candidates and explore scenarios"
- Mobile expanded panel JSX order must match desktop:
  ```
  <CandidateCardList useShortName />
  <PollManager />                    ← NEW: add before PrimaryControlsPanel
  <PrimaryControlsPanel />           ← now only has global sliders + weights + reset
  <PrimaryResultsSummary />
  <WinProbabilityBars />
  ```
- Add `PollManager` import to the file

### 7. Consolidate Model Code (Worker ↔ primaryModel.ts)

**Problem:** `primary.worker.ts` duplicates all scoring functions from `primaryModel.ts` with different formulas. The worker is what runs in production, so the worker's formulas are canonical.

#### Formula Divergence Table (worker = canonical)

| Function | primaryModel.ts (current) | Worker (canonical) |
|----------|--------------------------|-------------------|
| `computeDemographicScore` return | `demoWeight * totalScore` (raw sum ~0-4) | `demoWeight * (sum) / 4` (normalized ~0-1) |
| Demographic race term | `affinityBlack*blackPct + affinityHispanic*hispanicPct` | Adds `(1-affinityBlack)*(1-blackPct)` third term |
| Demographic income | Logistic: `ratio/(1+ratio)` sigmoid | Deviation: `clamp(0.5 + deviation*(college-working), 0, 1)` |
| `computeIdeologyScore` | Piecewise linear: 7 brackets mapping lean→ideology 2-8 | Linear: `wardIdeology = 5 - (clampedLean / 10)` |
| `computeTurnout` urban/rural | urban:0.85, suburban:1.0, rural:0.90 | urban:0.95, suburban:1.05, rural:1.0 |
| `computeTurnout` partisan | Step function: >20→1.1, 5-20→1.0, <5→0.8 | Continuous: `1 + clamp(absLean-20, 0, 30)*0.003` |
| `softmax` temp clamp | `Math.max(temperature, 0.001)` | `Math.max(0.01, temperature)` |

#### Fix approach:

1. **Update `primaryModel.ts`** to match every worker formula exactly (use table above)
2. **Add `clamp` utility** to `primaryModel.ts` (currently only in worker)
3. **Remove the entire piecewise ideology mapping** in `primaryModel.ts` — replace with the worker's single-line linear formula
4. **Make `primary.worker.ts` import from `primaryModel.ts`:**
   - Vite's worker bundling with `type: 'module'` supports imports from local files
   - **Verification step:** Before committing, test that `import { computeCandidateScore, ... } from './lib/primaryModel'` works in both `vite dev` and `vite build`. If it fails, fallback: keep duplication but add a comment linking the files and ensure formulas match.
   - Remove all duplicated function definitions from the worker
   - Worker keeps only: `aggregateStatewide`, `runMonteCarlo`, `percentile`, and the `onmessage` handler
5. **Move `aggregateStatewide`** to `primaryModel.ts` as well (pure function, no worker dependency)
6. **Keep `runMonteCarlo` in the worker** (it's worker-specific orchestration code)

### 8. PrimaryControlsPanel Restructure

**File:** `packages/client/src/features/primary-simulator/components/PrimaryControlsPanel.tsx`

Two options:
- **Option A (minimal):** Keep PrimaryControlsPanel but remove PollManager from it. PollManager renders directly in `index.tsx` sidebar above PrimaryControlsPanel.
- **Option B (clean):** Rename to `GlobalControlsPanel` since it only contains global sliders + weights + reset after PollManager extraction.

Go with **Option A** — less churn, just remove the `<PollManager />` line from PrimaryControlsPanel and add it directly in the sidebar in `index.tsx`.

---

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/App.tsx` | Nav label: "Primary" → "Primary Simulator" |
| `packages/client/src/features/primary-simulator/index.tsx` | Sidebar reorder, remove PrimaryGuide, add PollManager directly, update mount effect |
| `packages/client/src/features/primary-simulator/components/PrimaryControlsPanel.tsx` | Remove PollManager import/render |
| `packages/client/src/features/primary-simulator/components/PollManager.tsx` | Swap tab order (Scenarios first), rename "Polls" → "Polling" |
| `packages/client/src/features/primary-simulator/components/MobileBottomPanel.tsx` | Update CTA text, match new component order |
| `packages/client/src/stores/primaryStore.ts` | Default pollSource → 'scenario', default activePresetId to first preset |
| `packages/client/src/features/primary-simulator/lib/primaryModel.ts` | Update formulas to match worker's canonical versions, add clamp |
| `packages/client/src/features/primary-simulator/primary.worker.ts` | Import from primaryModel.ts, remove duplicated functions |
| `packages/client/src/features/primary-simulator/components/PrimaryGuide.tsx` | DELETE |
| `documentation/22-primary-simulator.md` | Update to reflect new layout, removed guide, model consolidation |

---

## Verification

1. **Build check:** `tsc -b && vite build` — must pass with no errors
2. **Visual check:** Open `/primary` on desktop:
   - Sidebar shows: Candidates → Scenarios/Polling tabs (Scenarios active) → Global sliders → Factor weights → Reset → Results → Win probability
   - No PrimaryGuide visible
   - Default scenario preset is applied, map shows predictions
3. **Mobile check:** Open `/primary` on mobile:
   - Bottom panel collapsed shows top 4 candidates + updated CTA
   - Expanded panel matches desktop order
4. **Nav check:** Navigation shows "Primary Simulator" (not "Primary")
5. **Model check:** Adjust candidate sliders — map updates in real-time via worker, no console errors
6. **Tab switching:** Click "Polling" tab — shows poll averages/trend chart/table. Click "Scenarios" — shows preset dropdown
7. **Worker imports:** Verify no duplicate function definitions in `primary.worker.ts`
8. **Existing tests:** Run `npm test` — all 30 tests pass
9. **URL state:** Adjust parameters, copy URL, paste in new tab — state restores correctly
