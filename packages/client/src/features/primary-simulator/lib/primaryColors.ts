import chroma from 'chroma-js';
import { DEFAULT_CANDIDATES } from './candidates';

/**
 * Color utilities for the primary simulator map and charts.
 *
 * Provides per-candidate color lookups, heatmap gradient generators,
 * winner-color-with-opacity helpers, and all color constants used by
 * the primary map layers.
 */

// -- Candidate Color Registry ----------------------------------------------------

/** Maps candidate ID to their assigned hex color. */
export const CANDIDATE_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CANDIDATES.map((c) => [c.id, c.color]),
);

/** Fallback color for unknown candidates or no-data wards. */
export const NO_DATA_COLOR = '#d4d4d4';

/** Light background used when a candidate has near-zero support in a ward. */
export const HEATMAP_MIN_COLOR = '#f8fafc';

// -- Primary Map Color Constants -------------------------------------------------

/** All color constants used by the primary simulator map layers. */
export const PRIMARY_MAP_COLORS = {
  /** Neutral gray for wards with no prediction data */
  noData: NO_DATA_COLOR,
  /** Ward outline stroke color */
  wardStroke: '#64748b',
  /** Ward outline stroke on hover */
  wardStrokeHover: '#1e293b',
  /** Ward fill when selected/highlighted */
  wardSelectedFill: '#fbbf24',
  /** Minimum (lightest) color for heatmap gradients */
  heatmapMin: HEATMAP_MIN_COLOR,
  /** Per-candidate colors */
  candidates: CANDIDATE_COLORS,
} as const;

// -- Heatmap Gradient Generators -------------------------------------------------

/** Cache of chroma scales keyed by candidate ID to avoid repeated construction. */
const scaleCache = new Map<string, chroma.Scale>();

/**
 * Returns a function that maps a vote-share value (0-1) to a color string,
 * producing a light-to-dark gradient in the candidate's signature color.
 * Used for the single-candidate heatmap map mode.
 *
 * @param candidateId - The candidate whose color gradient to generate
 * @returns A function mapping 0-1 to a hex color string
 */
export function getCandidateColorScale(candidateId: string): (value: number) => string {
  const cached = scaleCache.get(candidateId);
  if (cached) {
    return (value: number) => cached(value).hex();
  }

  const baseColor = CANDIDATE_COLORS[candidateId] ?? NO_DATA_COLOR;

  // Build a 3-stop scale: white -> light tint -> full color -> darkened color
  const lightTint = chroma.mix(HEATMAP_MIN_COLOR, baseColor, 0.2).hex();
  const darkened = chroma(baseColor).darken(1.5).hex();
  const scale = chroma
    .scale([HEATMAP_MIN_COLOR, lightTint, baseColor, darkened])
    .domain([0, 0.15, 0.4, 1.0])
    .mode('lab');

  scaleCache.set(candidateId, scale);

  return (value: number) => scale(value).hex();
}

// -- Winner Color Helpers --------------------------------------------------------

/** Minimum opacity for the winner color (used when margin is near zero). */
const MIN_WINNER_OPACITY = 0.25;

/** Maximum opacity for the winner color (used when margin is large). */
const MAX_WINNER_OPACITY = 0.95;

/** Margin (percentage points) at which max opacity is reached. */
const MAX_MARGIN_FOR_OPACITY = 30;

/**
 * Returns the winner's color with alpha/opacity scaled by margin of victory.
 * Narrow wins appear washed-out; blowouts appear fully saturated.
 *
 * @param winnerId - The winning candidate's ID
 * @param margin - Winner's margin of victory in percentage points (0-100)
 * @returns An rgba color string
 */
export function getWinnerColor(winnerId: string, margin: number): string {
  const baseColor = CANDIDATE_COLORS[winnerId] ?? NO_DATA_COLOR;
  const clampedMargin = Math.min(Math.abs(margin), MAX_MARGIN_FOR_OPACITY);
  const opacity =
    MIN_WINNER_OPACITY +
    (MAX_WINNER_OPACITY - MIN_WINNER_OPACITY) *
      (clampedMargin / MAX_MARGIN_FOR_OPACITY);

  return chroma(baseColor).alpha(opacity).css();
}

/**
 * Clears the cached chroma scales. Useful when candidate colors change
 * (e.g., user customization in a future version).
 */
export function clearColorScaleCache(): void {
  scaleCache.clear();
}
