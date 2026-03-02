import { memo, useMemo, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { usePrimaryStore } from '@/stores/primaryStore';
import { REGION_LABELS, type Region } from '@/shared/lib/regionMapping';

/**
 * PrimaryResultsSummary -- statewide vote totals panel with collapsible
 * regional breakdown for the primary election simulator.
 *
 * Reads directly from the primary store (no props). Shows:
 *   1. Leader highlight card with margin over runner-up
 *   2. Statewide vote totals sorted by votes descending
 *   3. Collapsible regional breakdown with top 3 candidates per region
 */

/** Format a number with locale-aware comma separators. */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format a vote share fraction (0-1) as a percentage string with one decimal. */
function formatPct(share: number): string {
  return (share * 100).toFixed(1) + '%';
}

/** Region IDs in display order. */
const REGION_ORDER: Region[] = [
  'milwaukee_metro',
  'madison_metro',
  'fox_valley',
  'rural',
];

// Wisconsin county FIPS 3-digit codes to region mapping
const COUNTY_FIPS_TO_REGION: Record<string, Region> = {
  '079': 'milwaukee_metro',
  '133': 'milwaukee_metro',
  '089': 'milwaukee_metro',
  '131': 'milwaukee_metro',
  '025': 'madison_metro',
  '009': 'fox_valley',
  '087': 'fox_valley',
  '139': 'fox_valley',
  '015': 'fox_valley',
};

function getRegionFromRuId(ruId: string): Region {
  if (ruId.length >= 5) {
    const countyCode = ruId.substring(2, 5);
    return COUNTY_FIPS_TO_REGION[countyCode] ?? 'rural';
  }
  return 'rural';
}

export const PrimaryResultsSummary = memo(function PrimaryResultsSummary() {
  const statewideTotals = usePrimaryStore((s) => s.statewideTotals);
  const predictions = usePrimaryStore((s) => s.predictions);
  const candidates = usePrimaryStore((s) => s.candidates);
  const isComputing = usePrimaryStore((s) => s.isComputing);

  const [showRegional, setShowRegional] = useState(false);

  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  const sortedTotals = useMemo(() => {
    if (!statewideTotals || statewideTotals.length === 0) return [];
    return [...statewideTotals]
      .filter((cv) => {
        const c = candidateMap.get(cv.candidateId);
        return c != null && c.isActive;
      })
      .sort((a, b) => b.votes - a.votes);
  }, [statewideTotals, candidateMap]);

  const grandTotal = useMemo(
    () => sortedTotals.reduce((sum, cv) => sum + cv.votes, 0),
    [sortedTotals],
  );

  if (!statewideTotals || sortedTotals.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Statewide Results
        </h3>
        <p className="text-xs text-muted-foreground italic">
          {isComputing
            ? 'Computing predictions...'
            : 'Adjust parameters to see results.'}
        </p>
      </div>
    );
  }

  const leader = sortedTotals[0];
  const leaderCandidate = candidateMap.get(leader.candidateId);
  const runnerUp = sortedTotals.length > 1 ? sortedTotals[1] : null;
  const leaderMarginPts =
    runnerUp != null && grandTotal > 0
      ? ((leader.votes - runnerUp.votes) / grandTotal) * 100
      : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Statewide Results
      </h3>

      {/* Leader highlight card */}
      {leaderCandidate && (
        <div
          className="rounded-lg border border-border/30 p-3 shadow-sm"
          style={{
            backgroundColor: leaderCandidate.color + '10',
            borderColor: leaderCandidate.color + '30',
          }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: leaderCandidate.color }}
                aria-hidden="true"
              />
              <span
                className="text-lg font-bold"
                style={{ color: leaderCandidate.color }}
              >
                {leaderCandidate.name}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Leading by {leaderMarginPts.toFixed(1)} points
              {runnerUp != null && (
                <span>
                  {' '}over {candidateMap.get(runnerUp.candidateId)?.shortName ?? 'Unknown'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Candidate vote totals table */}
      <div
        className="space-y-1.5"
        role="list"
        aria-label="Statewide vote totals by candidate"
      >
        {sortedTotals.map((cv) => {
          const candidate = candidateMap.get(cv.candidateId);
          if (!candidate) return null;

          const pct = grandTotal > 0 ? cv.votes / grandTotal : 0;

          return (
            <div
              key={cv.candidateId}
              className="flex items-center justify-between text-sm"
              role="listitem"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: candidate.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{candidate.shortName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(cv.votes)}
                </span>
                <span className="text-xs font-medium tabular-nums w-12 text-right">
                  {formatPct(pct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
        <span>Total</span>
        <span className="tabular-nums">{formatNumber(grandTotal)} votes</span>
      </div>

      <Separator className="my-1" />

      {/* Regional Breakdown (collapsible) */}
      {predictions != null && predictions.length > 0 && (
        <RegionalBreakdown
          predictions={predictions}
          candidateMap={candidateMap}
          isOpen={showRegional}
          onToggle={() => setShowRegional((prev) => !prev)}
        />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Regional Breakdown sub-component
// ---------------------------------------------------------------------------

type CandidateEntry = ReturnType<typeof usePrimaryStore.getState>['candidates'][number];

interface RegionalBreakdownProps {
  predictions: NonNullable<ReturnType<typeof usePrimaryStore.getState>['predictions']>;
  candidateMap: Map<string, CandidateEntry>;
  isOpen: boolean;
  onToggle: () => void;
}

const RegionalBreakdown = memo(function RegionalBreakdown({
  predictions,
  candidateMap,
  isOpen,
  onToggle,
}: RegionalBreakdownProps) {
  const regionTotals = useMemo(() => {
    const regionVoteMap = new Map<
      Region,
      { total: number; byCandId: Map<string, number> }
    >();

    for (const region of REGION_ORDER) {
      regionVoteMap.set(region, {
        total: 0,
        byCandId: new Map<string, number>(),
      });
    }

    for (const pred of predictions) {
      const region = getRegionFromRuId(pred.ruId);
      const entry = regionVoteMap.get(region);
      if (!entry) continue;

      entry.total += pred.totalVotes;
      for (const cv of pred.candidates) {
        entry.byCandId.set(
          cv.candidateId,
          (entry.byCandId.get(cv.candidateId) ?? 0) + cv.votes,
        );
      }
    }

    const result: Array<{
      region: Region;
      label: string;
      total: number;
      topCandidates: Array<{
        candidateId: string;
        votes: number;
        pct: number;
      }>;
    }> = [];

    for (const region of REGION_ORDER) {
      const entry = regionVoteMap.get(region);
      if (!entry || entry.total === 0) continue;

      const candidateResults = Array.from(entry.byCandId.entries())
        .filter(([candId]) => {
          const c = candidateMap.get(candId);
          return c != null && c.isActive;
        })
        .map(([candidateId, votes]) => ({
          candidateId,
          votes,
          pct: entry.total > 0 ? votes / entry.total : 0,
        }))
        .sort((a, b) => b.votes - a.votes);

      result.push({
        region,
        label: REGION_LABELS[region],
        total: entry.total,
        topCandidates: candidateResults.slice(0, 3),
      });
    }

    return result;
  }, [predictions, candidateMap]);

  if (regionTotals.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        aria-expanded={isOpen}
        aria-controls="primary-regional-breakdown"
      >
        <span
          className="transition-transform duration-150 inline-block"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          &#9654;
        </span>
        Regional Breakdown
      </button>

      {isOpen && (
        <div
          id="primary-regional-breakdown"
          className="mt-2 space-y-2.5 pl-4"
          role="list"
          aria-label="Regional vote breakdown"
        >
          {regionTotals.map(({ region, label, total, topCandidates }) => (
            <div key={region} className="space-y-1" role="listitem">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatNumber(total)} votes
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {topCandidates.map((tc) => {
                  const candidate = candidateMap.get(tc.candidateId);
                  if (!candidate) return null;

                  return (
                    <span
                      key={tc.candidateId}
                      className="flex items-center gap-1 text-[11px]"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: candidate.color }}
                        aria-hidden="true"
                      />
                      <span>{candidate.shortName}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {(tc.pct * 100).toFixed(0)}%
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
