import { memo, useMemo } from 'react';
import type { PrimaryRuPrediction, PrimaryCandidateVote } from '@/stores/primaryStore';
import { CANDIDATE_COLORS, NO_DATA_COLOR } from '../lib/primaryColors';
import { DEFAULT_CANDIDATES } from '../lib/candidates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of candidates to show in the tooltip before collapsing. */
const MAX_VISIBLE_CANDIDATES = 3;

/** Tooltip dimensions for viewport clamping. */
const TOOLTIP_WIDTH = 240;
const TOOLTIP_HEIGHT = 180;
const TOOLTIP_OFFSET = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map from candidate ID to display name for fast lookup. */
const CANDIDATE_NAMES: Record<string, string> = Object.fromEntries(
  DEFAULT_CANDIDATES.map((c) => [c.id, c.shortName]),
);

function getCandidateName(candidateId: string): string {
  return CANDIDATE_NAMES[candidateId] ?? candidateId;
}

function getCandidateColor(candidateId: string): string {
  return CANDIDATE_COLORS[candidateId] ?? NO_DATA_COLOR;
}

function formatPct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function formatVotes(value: number): string {
  return value.toLocaleString();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrimaryTooltipProps {
  /** Reporting unit (ward) display name */
  ruName: string;
  /** County name */
  county: string;
  /** Full prediction for this ward, or null if no data */
  prediction: PrimaryRuPrediction | null;
  /** Cursor x position in pixels */
  x: number;
  /** Cursor y position in pixels */
  y: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PrimaryTooltip = memo(function PrimaryTooltip({
  ruName,
  county,
  prediction,
  x,
  y,
}: PrimaryTooltipProps) {
  // Sort candidates by vote share descending
  const sortedCandidates = useMemo((): PrimaryCandidateVote[] => {
    if (!prediction) return [];
    return [...prediction.candidates].sort((a, b) => b.voteShare - a.voteShare);
  }, [prediction]);

  const visibleCandidates = sortedCandidates.slice(0, MAX_VISIBLE_CANDIDATES);
  const hiddenCount = Math.max(0, sortedCandidates.length - MAX_VISIBLE_CANDIDATES);

  // Clamp tooltip to viewport edges
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const clampedLeft =
    x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > vw
      ? x - TOOLTIP_WIDTH - TOOLTIP_OFFSET
      : x + TOOLTIP_OFFSET;
  const clampedTop = Math.max(
    8,
    Math.min(y - TOOLTIP_HEIGHT / 2, vh - TOOLTIP_HEIGHT - 8),
  );

  // Determine border accent color from winner
  const borderColor = prediction
    ? getCandidateColor(prediction.winnerId)
    : NO_DATA_COLOR;

  return (
    <div
      className="pointer-events-none absolute z-50 hidden glass-panel border-l-4 px-3 py-2 text-sm transition-opacity duration-150 md:block"
      role="tooltip"
      style={{
        left: clampedLeft,
        top: clampedTop,
        borderLeftColor: borderColor,
        minWidth: TOOLTIP_WIDTH,
      }}
    >
      {/* Header: ward name and county */}
      <div className="font-semibold leading-tight">{ruName}</div>
      <div className="text-xs text-muted-foreground">{county} County</div>

      {prediction ? (
        <>
          {/* Candidate breakdown */}
          <div className="mt-1.5 space-y-1">
            {visibleCandidates.map((cv) => (
              <div
                key={cv.candidateId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: getCandidateColor(cv.candidateId) }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">
                    {getCandidateName(cv.candidateId)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                  <span>{formatPct(cv.voteShare)}</span>
                  <span>({formatVotes(cv.votes)})</span>
                </div>
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="text-xs text-muted-foreground italic">
                +{hiddenCount} more
              </div>
            )}
          </div>

          {/* Separator and total */}
          <div className="mt-1.5 border-t border-border/50 pt-1 text-xs text-muted-foreground">
            Total: {formatVotes(prediction.totalVotes)} votes
          </div>
        </>
      ) : (
        <div className="mt-1.5 text-xs text-muted-foreground italic">
          No prediction data
        </div>
      )}
    </div>
  );
});
