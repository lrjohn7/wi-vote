import { memo } from 'react';

interface TrendLegendProps {
  demCount: number;
  repCount: number;
  incCount: number;
  minYear: number | null;
  maxYear: number | null;
}

export const TrendLegend = memo(function TrendLegend({
  demCount,
  repCount,
  incCount,
  minYear,
  maxYear,
}: TrendLegendProps) {
  const total = demCount + repCount + incCount;

  return (
    <div className="glass-panel absolute bottom-6 left-4 z-10 w-52 p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">Trend Direction</p>

      {/* Ward counts */}
      <div className="space-y-1 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-5 rounded" style={{ backgroundColor: '#2166ac' }} />
            <span>Trending Democratic</span>
          </div>
          <span className="tabular-nums text-muted-foreground">{demCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-5 rounded" style={{ backgroundColor: '#d4d4d4' }} />
            <span>Inconclusive</span>
          </div>
          <span className="tabular-nums text-muted-foreground">{incCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-5 rounded" style={{ backgroundColor: '#b2182b' }} />
            <span>Trending Republican</span>
          </div>
          <span className="tabular-nums text-muted-foreground">{repCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Gradient bar */}
      <div className="mt-3">
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #b2182b, #ef8a62, #d4d4d4, #67a9cf, #2166ac)',
          }}
        />
        <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
          <span>Strong R</span>
          <span>Neutral</span>
          <span>Strong D</span>
        </div>
      </div>

      {/* Footer */}
      {total > 0 && (
        <p className="mt-2 text-[9px] text-muted-foreground">
          {total.toLocaleString()} wards
          {minYear != null && maxYear != null && ` \u00b7 ${minYear}\u2013${maxYear} elections`}
        </p>
      )}
    </div>
  );
});
