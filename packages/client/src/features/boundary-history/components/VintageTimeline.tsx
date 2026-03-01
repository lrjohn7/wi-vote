import { memo } from 'react';
import { WARD_VINTAGES } from '../hooks/useVintageBoundaries';

interface VintageTimelineProps {
  selectedVintage: number;
  comparisonVintage: number | null;
  onSelect: (vintage: number) => void;
  onComparisonSelect: (vintage: number | null) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export const VintageTimeline = memo(function VintageTimeline({
  selectedVintage,
  comparisonVintage,
  onSelect,
  onComparisonSelect,
  isPlaying,
  onPlayToggle,
}: VintageTimelineProps) {
  const vintages = WARD_VINTAGES.map((v) => v.vintage);
  const selectedIdx = vintages.indexOf(selectedVintage);

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ward Boundary Timeline</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-content2 text-sm transition-colors hover:bg-content2/80"
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* Timeline track */}
      <div className="relative mb-4 px-2">
        {/* Track line */}
        <div className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-border" />

        {/* Progress line */}
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground transition-all duration-300"
          style={{
            left: '8px',
            width: `${(selectedIdx / (vintages.length - 1)) * 100}%`,
          }}
        />

        {/* Vintage nodes */}
        <div className="relative flex justify-between">
          {WARD_VINTAGES.map((v) => {
            const isSelected = v.vintage === selectedVintage;
            const isComparison = v.vintage === comparisonVintage;

            return (
              <button
                key={v.vintage}
                onClick={() => onSelect(v.vintage)}
                className={`relative flex flex-col items-center gap-1 transition-all ${
                  isSelected ? 'scale-110' : ''
                }`}
                aria-label={`${v.label}: ${v.description}`}
                aria-pressed={isSelected}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-foreground bg-foreground'
                      : isComparison
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-muted-foreground bg-background hover:border-foreground'
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isSelected
                      ? 'text-foreground'
                      : isComparison
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {v.vintage}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div className="mb-3 text-center text-xs text-muted-foreground">
        {WARD_VINTAGES.find((v) => v.vintage === selectedVintage)?.description}
      </div>

      {/* Comparison selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Compare with:</span>
        <div className="flex gap-1" role="group" aria-label="Select comparison vintage">
          <button
            onClick={() => onComparisonSelect(null)}
            aria-pressed={comparisonVintage === null}
            className={`rounded px-2.5 py-1.5 transition-colors ${
              comparisonVintage === null
                ? 'bg-foreground text-background'
                : 'bg-content2 text-muted-foreground hover:text-foreground'
            }`}
          >
            None
          </button>
          {vintages
            .filter((v) => v !== selectedVintage)
            .map((v) => (
              <button
                key={v}
                onClick={() => onComparisonSelect(v)}
                aria-pressed={comparisonVintage === v}
                className={`rounded px-2.5 py-1.5 transition-colors ${
                  comparisonVintage === v
                    ? 'bg-amber-500 text-white'
                    : 'bg-content2 text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
});
