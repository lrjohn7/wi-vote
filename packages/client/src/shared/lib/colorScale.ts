import chroma from 'chroma-js';

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
    35, '#b2182b',
    42, '#d6604d',
    46, '#f4a582',
    48, '#fddbc7',
    50, '#f7f7f7',
    52, '#d1e5f0',
    54, '#92c5de',
    58, '#4393c3',
    65, '#2166ac',
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
    -30, '#b2182b',
    -16, '#d6604d',
    -8, '#f4a582',
    -4, '#fddbc7',
    0, '#f7f7f7',
    4, '#d1e5f0',
    8, '#92c5de',
    16, '#4393c3',
    30, '#2166ac',
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
  { label: 'R+30+', color: '#b2182b', min: 0, max: 35 },
  { label: 'R+8-30', color: '#d6604d', min: 35, max: 42 },
  { label: 'R+4-8', color: '#f4a582', min: 42, max: 46 },
  { label: 'R+0-4', color: '#fddbc7', min: 46, max: 48 },
  { label: 'Even', color: '#f7f7f7', min: 48, max: 52 },
  { label: 'D+0-4', color: '#d1e5f0', min: 52, max: 54 },
  { label: 'D+4-8', color: '#92c5de', min: 54, max: 58 },
  { label: 'D+8-30', color: '#4393c3', min: 58, max: 65 },
  { label: 'D+30+', color: '#2166ac', min: 65, max: 100 },
];

export const MARGIN_LEGEND_BINS: LegendBin[] = [
  { label: 'R+30+', color: '#b2182b', min: -100, max: -30 },
  { label: 'R+16-30', color: '#d6604d', min: -30, max: -16 },
  { label: 'R+8-16', color: '#f4a582', min: -16, max: -8 },
  { label: 'R+0-8', color: '#fddbc7', min: -8, max: -4 },
  { label: 'Even', color: '#f7f7f7', min: -4, max: 4 },
  { label: 'D+0-8', color: '#d1e5f0', min: 4, max: 8 },
  { label: 'D+8-16', color: '#92c5de', min: 8, max: 16 },
  { label: 'D+16-30', color: '#4393c3', min: 16, max: 30 },
  { label: 'D+30+', color: '#2166ac', min: 30, max: 100 },
];

export const NO_DATA_COLOR = '#d4d4d4';
