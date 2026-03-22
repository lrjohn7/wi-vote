import { memo } from 'react';
import { usePrimaryStore } from '@/stores/primaryStore';

/**
 * WinProbabilityBars -- horizontal bar chart showing each candidate's win
 * probability from the Monte Carlo simulation.
 *
 * Reads directly from the primary store (no props). Bars are sorted by
 * win probability descending. Each bar shows candidate name with colored dot,
 * filled bar in candidate color, and percentage label.
 */
export const WinProbabilityBars = memo(function WinProbabilityBars() {
  const monteCarlo = usePrimaryStore((s) => s.monteCarlo);
  const candidates = usePrimaryStore((s) => s.candidates);
  const isComputing = usePrimaryStore((s) => s.isComputing);

  if (!monteCarlo || monteCarlo.length === 0) {
    return (
      <div className="rounded-lg bg-content2/40 p-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Win Probability
        </h3>
        <p className="text-xs text-muted-foreground italic">
          {isComputing ? 'Computing simulation...' : 'Adjust parameters to run simulation.'}
        </p>
      </div>
    );
  }

  // Build a candidate lookup for O(1) access
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  // Filter to active candidates and sort by win probability descending
  const sorted = [...monteCarlo]
    .filter((mc) => {
      const candidate = candidateMap.get(mc.candidateId);
      return candidate != null && candidate.isActive;
    })
    .sort((a, b) => b.winProbability - a.winProbability);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-content2/40 p-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Win Probability
        </h3>
        <p className="text-xs text-muted-foreground italic">
          No active candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-content2/40 p-3">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Win Probability
      </h3>
      <div className="space-y-2" role="list" aria-label="Candidate win probabilities">
        {sorted.map((mc) => {
          const candidate = candidateMap.get(mc.candidateId);
          if (!candidate) return null;

          const pct = Math.round(mc.winProbability * 100);

          return (
            <div
              key={mc.candidateId}
              className="flex items-center gap-2"
              role="listitem"
              aria-label={`${candidate.shortName}: ${pct}% win probability`}
            >
              {/* Candidate name with colored dot */}
              <div className="flex items-center gap-1.5 w-20 shrink-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: candidate.color }}
                  aria-hidden="true"
                />
                <span className="text-xs truncate">{candidate.shortName}</span>
              </div>

              {/* Probability bar */}
              <div
                className="flex-1 h-4 rounded-full bg-muted/30 overflow-hidden"
                role="meter"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${candidate.shortName} win probability`}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: candidate.color,
                    minWidth: pct > 0 ? '2px' : '0',
                  }}
                />
              </div>

              {/* Percentage label */}
              <span className="text-xs font-mono w-8 text-right tabular-nums">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Simulation metadata */}
      <p className="text-[11px] text-muted-foreground/60 mt-2 italic">
        Based on Monte Carlo simulation
      </p>
    </div>
  );
});
