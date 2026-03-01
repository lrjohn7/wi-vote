import chroma from 'chroma-js';

// Dem % thresholds for the RdBu diverging color scale
const STRONG_R = 35;
const SOLID_R = 42;
const LEAN_R = 46;
const TILT_R = 48;
const EVEN = 50;
const TILT_D = 52;
const LEAN_D = 54;
const SOLID_D = 58;
const STRONG_D = 65;

// Margin thresholds (symmetric around 0)
const MARGIN_STRONG_R = -30;
const MARGIN_SOLID_R = -16;
const MARGIN_LEAN_R = -8;
const MARGIN_TILT_R = -4;
const MARGIN_EVEN = 0;
const MARGIN_TILT_D = 4;
const MARGIN_LEAN_D = 8;
const MARGIN_SOLID_D = 16;
const MARGIN_STRONG_D = 30;

// ColorBrewer RdBu diverging palette — red=Republican, blue=Democratic
// Centered at 50% (even split)
const RD_BU_COLORS = [
  '#b2182b', // Strong R (0-35%)
  '#d6604d', // Solid R (35-42%)
  '#f4a582', // Lean R (42-46%)
  '#fddbc7', // Tilt R (46-48%)
  '#f7f7f7', // Even (48-52%)
  '#d1e5f0', // Tilt D (52-54%)
  '#92c5de', // Lean D (54-58%)
  '#4393c3', // Solid D (58-65%)
  '#2166ac', // Strong D (65-100%)
];

const scale = chroma.scale(RD_BU_COLORS).domain([0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]);

export function getColor(demPct: number): string {
  return scale(demPct).hex();
}

export function getColorForMargin(margin: number): string {
  // margin: positive = D, negative = R
  // Convert to demPct equivalent: margin of 0 = 50% demPct
  const demPct = 50 + margin / 2;
  return getColor(demPct);
}

// MapLibre paint expression for feature-state driven choropleth
export const choroplethFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'demPct'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'demPct'],
    0, '#b2182b',
    STRONG_R, '#b2182b',
    SOLID_R, '#d6604d',
    LEAN_R, '#f4a582',
    TILT_R, '#fddbc7',
    EVEN, '#f7f7f7',
    TILT_D, '#d1e5f0',
    LEAN_D, '#92c5de',
    SOLID_D, '#4393c3',
    STRONG_D, '#2166ac',
    100, '#2166ac',
  ],
  '#d4d4d4', // No data — neutral gray
];

// Margin-based paint expression
export const marginFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'margin'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'margin'],
    MARGIN_STRONG_R, '#b2182b',
    MARGIN_SOLID_R, '#d6604d',
    MARGIN_LEAN_R, '#f4a582',
    MARGIN_TILT_R, '#fddbc7',
    MARGIN_EVEN, '#f7f7f7',
    MARGIN_TILT_D, '#d1e5f0',
    MARGIN_LEAN_D, '#92c5de',
    MARGIN_SOLID_D, '#4393c3',
    MARGIN_STRONG_D, '#2166ac',
  ],
  '#d4d4d4',
];

// Legend bin definitions
export interface LegendBin {
  label: string;
  color: string;
  min: number;
  max: number;
}

export const DEM_PCT_LEGEND_BINS: LegendBin[] = [
  { label: 'R+30+', color: '#b2182b', min: 0, max: STRONG_R },
  { label: 'R+8-30', color: '#d6604d', min: STRONG_R, max: SOLID_R },
  { label: 'R+4-8', color: '#f4a582', min: SOLID_R, max: LEAN_R },
  { label: 'R+0-4', color: '#fddbc7', min: LEAN_R, max: TILT_R },
  { label: 'Even', color: '#f7f7f7', min: TILT_R, max: TILT_D },
  { label: 'D+0-4', color: '#d1e5f0', min: TILT_D, max: LEAN_D },
  { label: 'D+4-8', color: '#92c5de', min: LEAN_D, max: SOLID_D },
  { label: 'D+8-30', color: '#4393c3', min: SOLID_D, max: STRONG_D },
  { label: 'D+30+', color: '#2166ac', min: STRONG_D, max: 100 },
];

export const MARGIN_LEGEND_BINS: LegendBin[] = [
  { label: 'R+30+', color: '#b2182b', min: -100, max: MARGIN_STRONG_R },
  { label: 'R+16-30', color: '#d6604d', min: MARGIN_STRONG_R, max: MARGIN_SOLID_R },
  { label: 'R+8-16', color: '#f4a582', min: MARGIN_SOLID_R, max: MARGIN_LEAN_R },
  { label: 'R+0-8', color: '#fddbc7', min: MARGIN_LEAN_R, max: MARGIN_TILT_R },
  { label: 'Even', color: '#f7f7f7', min: MARGIN_TILT_R, max: MARGIN_TILT_D },
  { label: 'D+0-8', color: '#d1e5f0', min: MARGIN_TILT_D, max: MARGIN_LEAN_D },
  { label: 'D+8-16', color: '#92c5de', min: MARGIN_LEAN_D, max: MARGIN_SOLID_D },
  { label: 'D+16-30', color: '#4393c3', min: MARGIN_SOLID_D, max: MARGIN_STRONG_D },
  { label: 'D+30+', color: '#2166ac', min: MARGIN_STRONG_D, max: 100 },
];

export const NO_DATA_COLOR = '#d4d4d4';
