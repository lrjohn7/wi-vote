import chroma from 'chroma-js';

// Purple-White-Orange diverging scale for shift visualization
// Purple = shifted more Republican, Orange = shifted more Democratic
// Distinct from the RdBu partisan scale to avoid confusion
const DIFF_COLORS = [
  '#7b3294', // Strong R shift
  '#c2a5cf', // Moderate R shift
  '#f7f7f7', // No change
  '#fdb863', // Moderate D shift
  '#e66101', // Strong D shift
];

const diffScale = chroma.scale(DIFF_COLORS).domain([-20, -8, 0, 8, 20]);

export function getDiffColor(diffMargin: number): string {
  return diffScale(diffMargin).hex();
}

// MapLibre paint expression for feature-state driven diff choropleth
export const diffChoroplethFillColor: maplibregl.ExpressionSpecification = [
  'case',
  ['!=', ['feature-state', 'diffMargin'], null],
  [
    'interpolate',
    ['linear'],
    ['feature-state', 'diffMargin'],
    -20, '#7b3294',
    -8, '#c2a5cf',
    0, '#f7f7f7',
    8, '#fdb863',
    20, '#e66101',
  ],
  '#d4d4d4', // No data
];

export interface DiffLegendBin {
  label: string;
  color: string;
  min: number;
  max: number;
}

export const DIFF_LEGEND_BINS: DiffLegendBin[] = [
  { label: 'R shift 20+', color: '#7b3294', min: -100, max: -20 },
  { label: 'R shift 8-20', color: '#c2a5cf', min: -20, max: -8 },
  { label: 'R shift 0-8', color: '#e6d8ef', min: -8, max: -2 },
  { label: 'No change', color: '#f7f7f7', min: -2, max: 2 },
  { label: 'D shift 0-8', color: '#fee0b6', min: 2, max: 8 },
  { label: 'D shift 8-20', color: '#fdb863', min: 8, max: 20 },
  { label: 'D shift 20+', color: '#e66101', min: 20, max: 100 },
];
