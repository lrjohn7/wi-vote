import { memo } from 'react';
import { MARGIN_LEGEND_BINS, NO_DATA_COLOR } from '@/shared/lib/colorScale';

export const MapLegend = memo(function MapLegend() {
  return (
    <div
      className="glass-panel rounded-lg p-3"
      role="img"
      aria-label="Election results color legend. Red shades indicate Republican-leaning wards, blue shades indicate Democratic-leaning wards."
    >
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Vote Margin
      </div>
      <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
        <span>Republican</span>
        <span>Democrat</span>
      </div>
      <div className="flex">
        {MARGIN_LEGEND_BINS.map((bin) => (
          <div key={bin.label} className="flex-1" aria-label={bin.label}>
            <div
              className="h-5 border border-white/50"
              style={{ backgroundColor: bin.color }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>R+30</span>
        <span>Even</span>
        <span>D+30</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <div
          className="h-3 w-3 rounded-sm border"
          style={{ backgroundColor: NO_DATA_COLOR }}
          aria-hidden="true"
        />
        <span>No data</span>
      </div>
    </div>
  );
});
