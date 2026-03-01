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

// Display metric type
export type DisplayMetric = 'margin' | 'demPct' | 'repPct' | 'turnout' | 'totalVotes';

// RepPct fill color (mirror of demPct — high R% = deep red)
export const repPctFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'repPct'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'repPct'],
    0, '#2166ac',
    35, '#2166ac',
    42, '#4393c3',
    46, '#92c5de',
    48, '#d1e5f0',
    50, '#f7f7f7',
    52, '#fddbc7',
    54, '#f4a582',
    58, '#d6604d',
    65, '#b2182b',
    100, '#b2182b',
  ],
  '#d4d4d4',
];

// Total votes fill — sequential purple scale
export const totalVotesFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'totalVotes'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'totalVotes'],
    0, '#f2f0f7',
    100, '#dadaeb',
    300, '#bcbddc',
    500, '#9e9ac8',
    1000, '#807dba',
    2000, '#6a51a3',
    5000, '#4a1486',
  ],
  '#d4d4d4',
];

// Turnout fill — sequential green scale (neutral, non-partisan)
// Uses totalVotes as proxy since registered voter data is unavailable.
export const turnoutFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'totalVotes'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'totalVotes'],
    0, '#f7fcf5',
    100, '#e5f5e0',
    300, '#c7e9c0',
    500, '#a1d99b',
    1000, '#74c476',
    2000, '#41ab5d',
    5000, '#006d2c',
  ],
  '#d4d4d4',
];

export function getFillColorForMetric(metric: DisplayMetric): maplibregl.ExpressionSpecification {
  switch (metric) {
    case 'margin': return marginFillColor;
    case 'demPct': return choroplethFillColor;
    case 'repPct': return repPctFillColor;
    case 'totalVotes': return totalVotesFillColor;
    case 'turnout': return turnoutFillColor;
    default: return marginFillColor;
  }
}

export const REP_PCT_LEGEND_BINS: LegendBin[] = [
  { label: 'D+30+', color: '#2166ac', min: 0, max: 35 },
  { label: 'D+8-30', color: '#4393c3', min: 35, max: 42 },
  { label: 'D+4-8', color: '#92c5de', min: 42, max: 46 },
  { label: 'D+0-4', color: '#d1e5f0', min: 46, max: 48 },
  { label: 'Even', color: '#f7f7f7', min: 48, max: 52 },
  { label: 'R+0-4', color: '#fddbc7', min: 52, max: 54 },
  { label: 'R+4-8', color: '#f4a582', min: 54, max: 58 },
  { label: 'R+8-30', color: '#d6604d', min: 58, max: 65 },
  { label: 'R+30+', color: '#b2182b', min: 65, max: 100 },
];

export const TOTAL_VOTES_LEGEND_BINS: LegendBin[] = [
  { label: '0-100', color: '#f2f0f7', min: 0, max: 100 },
  { label: '100-300', color: '#dadaeb', min: 100, max: 300 },
  { label: '300-500', color: '#bcbddc', min: 300, max: 500 },
  { label: '500-1k', color: '#9e9ac8', min: 500, max: 1000 },
  { label: '1k-2k', color: '#807dba', min: 1000, max: 2000 },
  { label: '2k-5k', color: '#6a51a3', min: 2000, max: 5000 },
  { label: '5k+', color: '#4a1486', min: 5000, max: 100000 },
];

export const TURNOUT_LEGEND_BINS: LegendBin[] = [
  { label: '0-100', color: '#f7fcf5', min: 0, max: 100 },
  { label: '100-300', color: '#e5f5e0', min: 100, max: 300 },
  { label: '300-500', color: '#c7e9c0', min: 300, max: 500 },
  { label: '500-1k', color: '#a1d99b', min: 500, max: 1000 },
  { label: '1k-2k', color: '#74c476', min: 1000, max: 2000 },
  { label: '2k-5k', color: '#41ab5d', min: 2000, max: 5000 },
  { label: '5k+', color: '#006d2c', min: 5000, max: 100000 },
];

export function getLegendBinsForMetric(metric: DisplayMetric): LegendBin[] {
  switch (metric) {
    case 'margin': return MARGIN_LEGEND_BINS;
    case 'demPct': return DEM_PCT_LEGEND_BINS;
    case 'repPct': return REP_PCT_LEGEND_BINS;
    case 'totalVotes': return TOTAL_VOTES_LEGEND_BINS;
    case 'turnout': return TURNOUT_LEGEND_BINS;
    default: return MARGIN_LEGEND_BINS;
  }
}

export function getLegendTitleForMetric(metric: DisplayMetric): string {
  switch (metric) {
    case 'margin': return 'Vote Margin';
    case 'demPct': return 'Democratic %';
    case 'repPct': return 'Republican %';
    case 'totalVotes': return 'Total Votes';
    case 'turnout': return 'Turnout (Total Votes)';
    default: return 'Vote Margin';
  }
}
