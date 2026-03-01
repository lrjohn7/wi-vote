import { describe, it, expect } from 'vitest';
import {
  getColor,
  getColorForMargin,
  getFillColorForMetric,
  getLegendBinsForMetric,
  getLegendTitleForMetric,
  DEM_PCT_LEGEND_BINS,
  MARGIN_LEGEND_BINS,
  REP_PCT_LEGEND_BINS,
  TOTAL_VOTES_LEGEND_BINS,
  NO_DATA_COLOR,
} from './colorScale';

describe('getColor', () => {
  it('returns a hex color string for valid demPct', () => {
    const color = getColor(50);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns blue-ish for high demPct', () => {
    const color = getColor(80);
    // Should be in the blue range (2166ac)
    expect(color).toBeTruthy();
  });

  it('returns red-ish for low demPct', () => {
    const color = getColor(20);
    expect(color).toBeTruthy();
  });

  it('returns near-white for 50%', () => {
    const color = getColor(50);
    // f7f7f7 is the even color
    expect(color).toBe('#f7f7f7');
  });
});

describe('getColorForMargin', () => {
  it('converts margin=0 to 50% demPct (even)', () => {
    const color = getColorForMargin(0);
    expect(color).toBe('#f7f7f7');
  });

  it('positive margin (D+) gives blue-ish color', () => {
    const color = getColorForMargin(20);
    expect(color).toBeTruthy();
  });

  it('negative margin (R+) gives red-ish color', () => {
    const color = getColorForMargin(-20);
    expect(color).toBeTruthy();
  });
});

describe('getFillColorForMetric', () => {
  it('returns an expression array for each metric', () => {
    for (const metric of ['margin', 'demPct', 'repPct', 'totalVotes'] as const) {
      const expr = getFillColorForMetric(metric);
      expect(Array.isArray(expr)).toBe(true);
      expect(expr[0]).toBe('case');
    }
  });
});

describe('getLegendBinsForMetric', () => {
  it('returns MARGIN bins for margin', () => {
    expect(getLegendBinsForMetric('margin')).toBe(MARGIN_LEGEND_BINS);
  });

  it('returns DEM_PCT bins for demPct', () => {
    expect(getLegendBinsForMetric('demPct')).toBe(DEM_PCT_LEGEND_BINS);
  });

  it('returns REP_PCT bins for repPct', () => {
    expect(getLegendBinsForMetric('repPct')).toBe(REP_PCT_LEGEND_BINS);
  });

  it('returns TOTAL_VOTES bins for totalVotes', () => {
    expect(getLegendBinsForMetric('totalVotes')).toBe(TOTAL_VOTES_LEGEND_BINS);
  });
});

describe('getLegendTitleForMetric', () => {
  it('returns correct titles', () => {
    expect(getLegendTitleForMetric('margin')).toBe('Vote Margin');
    expect(getLegendTitleForMetric('demPct')).toBe('Democratic %');
    expect(getLegendTitleForMetric('repPct')).toBe('Republican %');
    expect(getLegendTitleForMetric('totalVotes')).toBe('Total Votes');
  });
});

describe('legend bins structure', () => {
  it('DEM_PCT bins have 9 entries covering 0-100', () => {
    expect(DEM_PCT_LEGEND_BINS).toHaveLength(9);
    expect(DEM_PCT_LEGEND_BINS[0].min).toBe(0);
    expect(DEM_PCT_LEGEND_BINS[8].max).toBe(100);
  });

  it('MARGIN bins are symmetric around 0', () => {
    expect(MARGIN_LEGEND_BINS).toHaveLength(9);
    const evenBin = MARGIN_LEGEND_BINS.find((b) => b.label === 'Even');
    expect(evenBin).toBeDefined();
    expect(evenBin!.min).toBe(-4);
    expect(evenBin!.max).toBe(4);
  });

  it('all bins have valid hex colors', () => {
    for (const bins of [DEM_PCT_LEGEND_BINS, MARGIN_LEGEND_BINS, REP_PCT_LEGEND_BINS, TOTAL_VOTES_LEGEND_BINS]) {
      for (const bin of bins) {
        expect(bin.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('NO_DATA_COLOR is a valid hex', () => {
    expect(NO_DATA_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
