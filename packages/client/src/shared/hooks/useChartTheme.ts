import { useThemeStore } from '@/stores/themeStore';

/**
 * Returns theme-aware colors for Recharts components.
 * Recharts accepts hex string props only — cannot use CSS variables directly.
 * This hook provides the correct hex colors for the current theme.
 */
export function useChartTheme() {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const dark = resolvedTheme === 'dark';

  return {
    // Axis and grid
    gridColor: dark ? '#333333' : '#e5e5e5',
    textColor: dark ? '#a3a3a3' : '#737373',
    axisColor: dark ? '#404040' : '#d4d4d4',

    // Tooltip
    tooltipBg: dark ? '#262626' : '#ffffff',
    tooltipBorder: dark ? '#404040' : '#e5e5e5',

    // Political colors (lighter in dark mode for readability)
    dem: dark ? '#67a9cf' : '#2166ac',
    rep: dark ? '#ef8a62' : '#b2182b',
    demLight: dark ? '#92c5de' : '#67a9cf',
    repLight: dark ? '#f4a582' : '#ef8a62',

    // Neutrals
    neutral: dark ? '#737373' : '#888888',
    zeroLine: dark ? '#404040' : '#d4d4d4',
    noData: dark ? '#404040' : '#d4d4d4',

    // General chart colors
    line1: dark ? '#60a5fa' : '#404040',
    line2: dark ? '#a78bfa' : '#8884d8',
    line3: dark ? '#6ee7b7' : '#82ca9d',
  } as const;
}
