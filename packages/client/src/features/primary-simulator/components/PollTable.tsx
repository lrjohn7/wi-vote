import { memo, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';
import { computePollingAverage } from '@/features/primary-simulator/lib/pollAveraging';
import type { PollAveragingConfig, PollWeightBreakdown } from '@/types/primary';

/**
 * Format an ISO date string (YYYY-MM-DD) to a compact "Mon DD" format.
 */
function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * PollTable -- compact list of all polls with computed weights and
 * toggle / delete controls.
 *
 * Reads directly from the primary store (no props). Polls are sorted by
 * end date descending (most recent first). Each row shows a checkbox to
 * toggle inclusion, pollster name, end date, sample size, a normalized
 * weight bar, and a delete button for user-added polls.
 */
export const PollTable = memo(function PollTable() {
  const polls = usePrimaryStore((s) => s.polls);
  const pollAveragingConfig = usePrimaryStore((s) => s.pollAveragingConfig);
  const candidates = usePrimaryStore((s) => s.candidates);
  const togglePollEnabled = usePrimaryStore((s) => s.togglePollEnabled);
  const removePoll = usePrimaryStore((s) => s.removePoll);

  // Compute weight breakdowns for all enabled polls
  const weightMap = useMemo(() => {
    const candidateIds = candidates.map((c) => c.id);
    const config: PollAveragingConfig = {
      ...pollAveragingConfig,
      referenceDate: new Date().toISOString().slice(0, 10),
    };
    const { weights } = computePollingAverage(polls, config, candidateIds);
    const map = new Map<string, PollWeightBreakdown>();
    for (const w of weights) {
      map.set(w.pollId, w);
    }
    return map;
  }, [polls, pollAveragingConfig, candidates]);

  // Sort polls by end date descending
  const sortedPolls = useMemo(() => {
    return [...polls].sort((a, b) => b.endDate.localeCompare(a.endDate));
  }, [polls]);

  const handleToggle = useCallback(
    (pollId: string) => {
      togglePollEnabled(pollId);
    },
    [togglePollEnabled],
  );

  const handleRemove = useCallback(
    (pollId: string) => {
      removePoll(pollId);
    },
    [removePoll],
  );

  if (sortedPolls.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Polls
        </h3>
        <p className="text-xs text-muted-foreground italic">
          No polls available. Add a poll to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-3">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Polls ({sortedPolls.length})
      </h3>

      <div className="space-y-1" role="list" aria-label="Poll list">
        {sortedPolls.map((poll) => {
          const weight = weightMap.get(poll.id);
          const normalizedPct = weight ? weight.normalizedWeight * 100 : 0;

          return (
            <div
              key={poll.id}
              className={
                'flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors ' +
                (poll.isEnabled
                  ? 'bg-content2/30 hover:bg-content2/50'
                  : 'bg-muted/20 opacity-50')
              }
              role="listitem"
              aria-label={`${poll.pollster}, ${formatShortDate(poll.endDate)}`}
            >
              {/* Enable/disable checkbox */}
              <input
                type="checkbox"
                checked={poll.isEnabled}
                onChange={() => handleToggle(poll.id)}
                className="h-3 w-3 shrink-0 rounded accent-foreground cursor-pointer"
                aria-label={`Include ${poll.pollster} in average`}
              />

              {/* Pollster name (truncated) */}
              <span
                className="text-xs truncate flex-1 min-w-0"
                title={poll.pollster}
              >
                {poll.pollster}
              </span>

              {/* End date */}
              <span className="text-[11px] text-muted-foreground shrink-0 w-12 text-right">
                {formatShortDate(poll.endDate)}
              </span>

              {/* Sample size */}
              <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-10 text-right tabular-nums">
                n={poll.sampleSize}
              </span>

              {/* Normalized weight bar */}
              <div
                className="w-14 h-2.5 rounded-full bg-muted/30 overflow-hidden shrink-0"
                title={`Weight: ${normalizedPct.toFixed(1)}%`}
                role="meter"
                aria-valuenow={normalizedPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${poll.pollster} weight`}
              >
                <div
                  className="h-full rounded-full bg-foreground/40 transition-all duration-200"
                  style={{
                    width: `${Math.min(normalizedPct, 100)}%`,
                    minWidth: poll.isEnabled && normalizedPct > 0 ? '1px' : '0',
                  }}
                />
              </div>

              {/* Weight percentage */}
              <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-8 text-right tabular-nums">
                {poll.isEnabled ? `${normalizedPct.toFixed(0)}%` : '--'}
              </span>

              {/* Delete button (only for user-added polls) */}
              {!poll.isBuiltIn ? (
                <button
                  type="button"
                  onClick={() => handleRemove(poll.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Remove ${poll.pollster}`}
                  title="Remove poll"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : (
                <div className="w-4 shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
