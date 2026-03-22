/**
 * Shared formatting utilities used across the app.
 * Centralizes margin/number formatting to avoid duplication.
 */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

/** Format a number with comma separators, rounded. e.g. 1,234 */
export function formatNumber(n: number): string {
  return NUMBER_FORMAT.format(Math.round(n));
}

/** Format a partisan margin as D+X / R+X / Even */
export function formatMargin(margin: number): string {
  if (Math.abs(margin) < 0.05) return 'Even';
  if (margin > 0) return `D+${margin.toFixed(1)}`;
  return `R+${Math.abs(margin).toFixed(1)}`;
}
