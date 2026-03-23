# UI/UX Enhancement Audit & Tracker

**Date:** 2026-03-19
**Audited using:** ui-ux-pro-max design intelligence skill
**Scope:** Full app UI/UX review across all pages and features

---

## Completed Quick Wins (2026-03-19)

### QW1. Turnout Gaps: Native `<select>` replaced with shadcn/ui Select
- **File:** `src/features/turnout-gaps/index.tsx`
- **Before:** Native HTML `<select>` elements for Year and Race Type selectors
- **After:** shadcn/ui `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` matching all other pages
- **Impact:** Visual consistency across app, proper dark mode support, consistent interaction pattern

### QW2. Nav pills: Focus-visible rings added
- **Files:** `src/App.tsx`, `src/shared/components/MobileNav.tsx`
- **Before:** No visible focus indicator when keyboard-navigating nav pills
- **After:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none` on all nav links (desktop + mobile)
- **Impact:** WCAG 2.1 SC 2.4.7 compliance (Focus Visible)

### QW3. Reduced-motion support added
- **File:** `src/index.css`
- **Before:** No `prefers-reduced-motion` support; animations play regardless of user preference
- **After:** Global `@media (prefers-reduced-motion: reduce)` rule disables all animations and transitions
- **Impact:** WCAG 2.1 SC 2.3.3 compliance (Animation from Interactions), vestibular disorder accessibility

### QW4. Page title hierarchy standardized
- **File:** `src/features/ward-explorer/index.tsx`
- **Before:** Ward Explorer used `text-xl font-bold` while 6 other features used `text-lg font-semibold` in control bars
- **After:** All control-bar page titles use `text-lg font-semibold`; standalone page headings (Data Manager, Analytics, Supreme Court content area) retain larger sizes
- **Impact:** Consistent typographic hierarchy across features

### QW5. Hover elevation on cards
- **Files:** `src/components/ui/card.tsx`, `src/features/ward-report/components/SimilarWards.tsx`, `src/features/turnout-gaps/index.tsx`
- **Before:** Cards had `transition-shadow duration-200` but no hover shadow change; SimilarWards had color-only hover
- **After:** `hover:shadow-md` on Card component, `hover:shadow-md` on SimilarWards links, `hover:shadow-md` on Turnout Gaps summary cards
- **Impact:** Clear interactive affordance, visual depth on hover

### QW6. Animation durations verified consistent
- **Finding:** Durations already follow a consistent pattern: 200ms (micro-interactions), 300ms (panel slides, fade-ins), 500ms (live data tickers), 1000ms (progress bar fills)
- **Status:** No changes needed — pattern is intentional and well-applied

### QW7. Logo hover: scale replaced with opacity
- **File:** `src/App.tsx`
- **Before:** `hover:scale-105` caused layout jitter on nav logo
- **After:** `hover:opacity-80` provides smooth feedback without layout shift
- **Impact:** Eliminates nav layout shift on hover

---

## Completed P1 — HIGH (2026-03-19)

### P1-1. Focus trap on ward detail panel
- **Files:** `shared/hooks/useFocusTrap.ts` (new), `election-map/components/WardDetailPanel.tsx`
- **Changes:** Created `useFocusTrap` hook that traps Tab/Shift+Tab within container, saves/restores previous focus on mount/unmount. Applied to WardDetailPanel with `role="dialog"` and `aria-modal="true"`. Added Escape key to close panel.
- **Impact:** WCAG 2.1 SC 2.4.3 (Focus Order) compliance; keyboard users no longer lose focus behind the panel

### P1-2. aria-live regions for async status updates
- **Files:** `election-map/index.tsx`, `turnout-gaps/index.tsx`, `ward-report/index.tsx`
- **Changes:** Added `role="status" aria-live="polite"` to loading overlays/containers; added `role="alert"` to error states
- **Impact:** Screen readers now announce loading/error state transitions

### P1-3. Shared EmptyState component
- **Files:** `shared/components/EmptyState.tsx` (new), `ward-explorer/index.tsx`, `turnout-gaps/index.tsx`
- **Props:** `icon` (LucideIcon, defaults to SearchX), `title`, `description`, `children`
- **Design:** Centered layout with 48px icon in bg-content2/60 circle, medium-weight title, muted description, optional action slot
- **Applied to:** Ward Explorer (no-results + no-selection states), Turnout Gaps (empty results)

### P1-4. Nav overflow on md breakpoint
- **Files:** `index.css` (new `scrollbar-hide` utility), `App.tsx`
- **Changes:** Added `scrollbar-hide` CSS utility (hides scrollbar across browsers), `min-w-0` to prevent flex overflow, CSS `mask-image` linear gradient for fade-edge indicators on both sides
- **Impact:** Nav scrolls smoothly without visible scrollbar; fade edges hint at more content

### P1-5. Theme toggle state indicator
- **File:** `App.tsx`
- **Changes:** Added text label ("Light", "Dark", "Auto") next to icon, visible on `sm+` breakpoint, hidden on mobile (icon-only). Adjusted button sizing to accommodate label.
- **Impact:** Users can see current theme mode at a glance instead of inferring from icon alone

---

## Remaining Enhancements (Prioritized)

### P2 — MEDIUM

| # | Issue | Files | Notes |
|---|-------|-------|-------|
| P2-1 | No data table alternative for map | Election Map, Trend Map | Accessibility: table view toggle for geographic data |
| P2-2 | Chart tooltip dark mode contrast | Recharts tooltip configs | Verify `#262626` bg has sufficient contrast |
| P2-3 | 3D mode missing sr description | Election Map 3D toggle | Add `aria-description` for screen readers |
| P2-4 | Sparklines lack sr descriptions | Trend sparkline grid | Add `aria-label` per sparkline |
| P2-5 | Document typography scale | Design system | Formalize heading/body/label size constants |

### P3 — LOW

| # | Issue | Files | Notes |
|---|-------|-------|-------|
| P3-1 | Loading skeleton coverage | Various | Use `PageSkeleton` consistently instead of "Loading..." text |
| P3-2 | Table horizontal scroll indicator | Election history tables | Add fade gradient on right edge |
| P3-3 | Select dropdown virtualization | Long year/race lists | For slow devices with many options |
| P3-4 | Scroll-to-top on route change | React Router | Add `<ScrollRestoration />` or `useScrollToTop()` |
| P3-5 | Consider Sankey diagram | Turnout Gaps | Visualize "registered -> voted -> Dem/Rep/Other" flow |

---

## Design System Notes

- **Current font:** Inter (sans-serif) — good for body text
- **Suggestion:** Add `font-variant-numeric: tabular-nums` to data-heavy components (already used on some via `tabular-nums` class)
- **Political palette:** ColorBrewer RdBu, centered at 50% — well implemented
- **Spacing pattern:** `gap-2` (tight), `gap-3` (sections), `gap-4` (major) — used consistently
- **Glass panel:** Unified utility class in `index.css` — well applied across all overlays
- **Card component:** shadcn/ui Card with `hover:shadow-md` transition — consistent base
