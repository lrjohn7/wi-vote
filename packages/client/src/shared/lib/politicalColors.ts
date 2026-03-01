/**
 * Political color constants for contexts that can't use CSS variables
 * (Recharts stroke/fill props, SVG attributes, canvas drawing).
 *
 * For DOM elements, prefer Tailwind classes: text-dem, bg-rep, etc.
 * These map to CSS variables defined in index.css that auto-adapt to dark mode.
 */
export const POLITICAL_COLORS = {
  dem: '#2166ac',
  rep: '#b2182b',
  demLight: '#67a9cf',
  repLight: '#ef8a62',
  neutral: '#888888',
  noData: '#d4d4d4',
} as const;
