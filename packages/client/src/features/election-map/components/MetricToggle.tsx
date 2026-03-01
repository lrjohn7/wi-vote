import { memo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { DisplayMetric } from '@/shared/lib/colorScale';

const METRICS: { value: DisplayMetric; label: string }[] = [
  { value: 'margin', label: 'Margin' },
  { value: 'demPct', label: 'Dem %' },
  { value: 'repPct', label: 'Rep %' },
  { value: 'totalVotes', label: 'Votes' },
];

export const MetricToggle = memo(function MetricToggle() {
  const displayMetric = useMapStore((s) => s.displayMetric);
  const setDisplayMetric = useMapStore((s) => s.setDisplayMetric);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Map display metric">
      {METRICS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setDisplayMetric(value)}
          aria-pressed={displayMetric === value}
          className={`rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
            displayMetric === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
});
