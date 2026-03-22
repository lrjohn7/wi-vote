import { memo, useMemo } from 'react';
import { usePrimaryStore } from '@/stores/primaryStore';
import { computePollingAverage } from '@/features/primary-simulator/lib/pollAveraging';
import type { PollAveragingConfig } from '@/types/primary';

/**
 * PollAverageSummary -- horizontal bar chart showing the current weighted
 * polling average for each candidate plus undecided percentage.
 *
 * Reads directly from the primary store (no props). Bars are sorted by
 * weighted average descending. Each bar uses the candidate's assigned color,
 * with width proportional to the maximum average in the set.
 */
export const PollAverageSummary = memo(function PollAverageSummary() {
  const polls = usePrimaryStore((s) => s.polls);
  const pollAveragingConfig = usePrimaryStore((s) => s.pollAveragingConfig);
  const candidates = usePrimaryStore((s) => s.candidates);

  const { averages, undecided, enabledCount } = useMemo(() => {
    const candidateIds = candidates.map((c) => c.id);
    const config: PollAveragingConfig = {
      ...pollAveragingConfig,
      referenceDate: new Date().toISOString().slice(0, 10),
    };
    const result = computePollingAverage(polls, config, candidateIds);
    const enabled = polls.filter((p) => p.isEnabled).length;
    return {
      averages: result.averages,
      undecided: result.undecided,
      enabledCount: enabled,
    };
  }, [polls, pollAveragingConfig, candidates]);

  // Build candidate lookup
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  // Sort averages descending and filter to active candidates with data
  const sorted = useMemo(() => {
    return [...averages]
      .filter((a) => {
        const c = candidateMap.get(a.candidateId);
        return c != null && c.isActive && a.average > 0;
      })
      .sort((a, b) => b.average - a.average);
  }, [averages, candidateMap]);

  const maxAvg = sorted.length > 0 ? sorted[0].average : 1;

  if (enabledCount === 0) {
    return (
      <div className="glass-panel rounded-lg p-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Poll Average
        </h3>
        <p className="text-xs text-muted-foreground italic">
          No polls enabled. Toggle polls on to see averages.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Poll Average
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>{enabledCount} poll{enabledCount !== 1 ? 's' : ''}</span>
          <span className="text-border/50">|</span>
          <span>avg {undecided.toFixed(1)}% undecided</span>
        </div>
      </div>

      {/* Candidate bars */}
      <div className="space-y-1.5" role="list" aria-label="Candidate polling averages">
        {sorted.map((avg) => {
          const candidate = candidateMap.get(avg.candidateId);
          if (!candidate) return null;

          const pct = avg.average;
          const barWidth = maxAvg > 0 ? (pct / maxAvg) * 100 : 0;

          return (
            <div
              key={avg.candidateId}
              className="flex items-center gap-2"
              role="listitem"
              aria-label={`${candidate.shortName}: ${pct.toFixed(1)}%`}
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

              {/* Average bar */}
              <div
                className="flex-1 h-4 rounded-full bg-muted/30 overflow-hidden"
                role="meter"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${candidate.shortName} polling average`}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: candidate.color,
                    minWidth: pct > 0 ? '2px' : '0',
                  }}
                />
              </div>

              {/* Percentage label */}
              <span className="text-xs font-mono w-10 text-right tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground/60 mt-2 italic">
        Weighted EWMA average (half-life {pollAveragingConfig.halfLifeDays}d)
      </p>
    </div>
  );
});
