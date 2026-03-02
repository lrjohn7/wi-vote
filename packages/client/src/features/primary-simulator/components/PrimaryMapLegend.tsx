import { memo, useMemo } from 'react';
import { usePrimaryStore, type PrimaryCandidateState, type PrimaryCandidateVote } from '@/stores/primaryStore';
import { getCandidateColorScale } from '../lib/primaryColors';

// ---------------------------------------------------------------------------
// Winner Takes All legend — shows all active candidates ranked by vote share
// ---------------------------------------------------------------------------

interface WinnerLegendProps {
  candidates: PrimaryCandidateState[];
  statewideTotals: PrimaryCandidateVote[] | null;
}

const WinnerLegend = memo(function WinnerLegend({
  candidates,
  statewideTotals,
}: WinnerLegendProps) {
  const activeCandidates = candidates.filter((c) => c.isActive);

  const sorted = useMemo(() => {
    return [...activeCandidates].sort((a, b) => {
      const aShare =
        statewideTotals?.find((t) => t.candidateId === a.id)?.voteShare ?? 0;
      const bShare =
        statewideTotals?.find((t) => t.candidateId === b.id)?.voteShare ?? 0;
      return bShare - aShare;
    });
  }, [activeCandidates, statewideTotals]);

  return (
    <div
      className="glass-panel rounded-lg p-3 shadow-lg max-w-[220px]"
      role="img"
      aria-label="Winner takes all legend showing each candidate color and statewide vote share"
    >
      <h4 className="text-xs font-medium mb-2 text-foreground">
        Winner Takes All
      </h4>
      <div className="space-y-1">
        {sorted.map((c) => {
          const share = statewideTotals?.find(
            (t) => t.candidateId === c.id,
          )?.voteShare;
          return (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-foreground">{c.shortName}</span>
              <span className="text-xs text-muted-foreground ml-auto font-mono">
                {share !== undefined
                  ? `${(share * 100).toFixed(1)}%`
                  : '--'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Opacity / margin-of-victory guide */}
      <div className="mt-2 pt-2 border-t border-border/30">
        <div className="text-[10px] text-muted-foreground mb-1">
          Margin of Victory
        </div>
        <div className="flex items-center gap-1">
          <div
            className="h-2.5 flex-1 rounded-sm"
            style={{
              background:
                'linear-gradient(to right, rgb(226 232 240 / 0.6), rgb(71 85 105))',
            }}
            aria-hidden="true"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>Close</span>
          <span>Strong</span>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Candidate Heatmap legend — single-candidate gradient with statewide share
// ---------------------------------------------------------------------------

interface HeatmapLegendProps {
  candidateId: string;
  candidates: PrimaryCandidateState[];
  statewideTotals: PrimaryCandidateVote[] | null;
}

const HeatmapLegend = memo(function HeatmapLegend({
  candidateId,
  candidates,
  statewideTotals,
}: HeatmapLegendProps) {
  const candidate = candidates.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const gradient = useMemo(() => {
    const colorFn = getCandidateColorScale(candidateId);
    const stops = Array.from({ length: 10 }, (_, i) => colorFn(i / 9));
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [candidateId]);

  const share = statewideTotals?.find(
    (t) => t.candidateId === candidateId,
  )?.voteShare;

  return (
    <div
      className="glass-panel rounded-lg p-3 shadow-lg max-w-[220px]"
      role="img"
      aria-label={`Heatmap legend for ${candidate.shortName} showing vote share gradient from 0 to 50 percent`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: candidate.color }}
          aria-hidden="true"
        />
        <h4 className="text-xs font-medium text-foreground">
          {candidate.shortName} Support
        </h4>
      </div>

      <div
        className="h-3 rounded-sm"
        style={{ background: gradient }}
        aria-hidden="true"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
        <span>0%</span>
        <span>25%</span>
        <span>50%+</span>
      </div>

      {share !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground">
          Statewide:{' '}
          <span className="font-mono font-medium text-foreground">
            {(share * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Top-level component — switches between winner and heatmap legends
// ---------------------------------------------------------------------------

export const PrimaryMapLegend = memo(function PrimaryMapLegend() {
  const mapMode = usePrimaryStore((s) => s.mapMode);
  const heatmapCandidateId = usePrimaryStore((s) => s.heatmapCandidateId);
  const candidates = usePrimaryStore((s) => s.candidates);
  const statewideTotals = usePrimaryStore((s) => s.statewideTotals);

  if (mapMode === 'winner') {
    return (
      <WinnerLegend
        candidates={candidates}
        statewideTotals={statewideTotals}
      />
    );
  }

  if (mapMode === 'candidate-heatmap' && heatmapCandidateId) {
    return (
      <HeatmapLegend
        candidateId={heatmapCandidateId}
        candidates={candidates}
        statewideTotals={statewideTotals}
      />
    );
  }

  return null;
});
