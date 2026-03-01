import { memo } from 'react';

function formatMarginShort(m: number): string {
  if (m > 0.5) return `D+${m.toFixed(1)}`;
  if (m < -0.5) return `R+${Math.abs(m).toFixed(1)}`;
  return 'Even';
}

interface WardTooltipProps {
  wardName: string;
  municipality: string;
  county: string;
  demPct?: number;
  repPct?: number;
  margin?: number;
  totalVotes?: number;
  isEstimate?: boolean;
  demCandidate?: string | null;
  repCandidate?: string | null;
  lowerMargin?: number;
  upperMargin?: number;
  x: number;
  y: number;
}

export const WardTooltip = memo(function WardTooltip({
  wardName,
  municipality,
  county,
  demPct,
  repPct,
  margin,
  totalVotes,
  isEstimate,
  demCandidate,
  repCandidate,
  lowerMargin,
  upperMargin,
  x,
  y,
}: WardTooltipProps) {
  const marginLabel =
    margin != null
      ? margin > 0
        ? `D+${margin.toFixed(1)}`
        : margin < 0
          ? `R+${Math.abs(margin).toFixed(1)}`
          : 'Even'
      : null;

  const borderColor = margin != null ? (margin > 0 ? 'var(--dem)' : 'var(--rep)') : '#cccccc';

  const demLabel = demCandidate || 'DEM';
  const repLabel = repCandidate || 'REP';

  // Clamp tooltip to viewport edges
  const tooltipWidth = 220;
  const tooltipHeight = 120;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const clampedLeft = x + 12 + tooltipWidth > vw ? x - tooltipWidth - 12 : x + 12;
  const clampedTop = Math.max(8, Math.min(y - tooltipHeight / 2, vh - tooltipHeight - 8));

  return (
    <div
      className="pointer-events-none absolute z-50 hidden glass-panel border-l-4 px-3 py-2 text-sm transition-opacity duration-150 md:block"
      role="tooltip"
      style={{
        left: clampedLeft,
        top: clampedTop,
        borderLeftColor: borderColor,
      }}
    >
      <div className="font-semibold">{wardName}</div>
      <div className="text-xs text-muted-foreground">
        {municipality}, {county} County
      </div>
      {demPct != null && (
        <>
          {/* Mini two-party bar */}
          <div className="my-1.5 flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={`Vote split: ${demLabel} ${demPct.toFixed(0)}%, ${repLabel} ${(repPct ?? 100 - demPct).toFixed(0)}%`}>
            <div style={{ width: `${demPct}%`, backgroundColor: 'var(--dem)' }} />
            <div style={{ width: `${repPct ?? 100 - demPct}%`, backgroundColor: 'var(--rep)' }} />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-dem">{demLabel} {demPct.toFixed(1)}%</span>
              <span className="text-rep">{repLabel} {repPct?.toFixed(1)}%</span>
            </div>
            {marginLabel && (
              <div className={`font-medium ${margin && margin > 0 ? 'text-dem' : 'text-rep'}`}>
                {marginLabel}
              </div>
            )}
            {lowerMargin != null && upperMargin != null && (
              <div className="text-muted-foreground">
                Range: {formatMarginShort(lowerMargin)} to {formatMarginShort(upperMargin)}
              </div>
            )}
            {totalVotes != null && (
              <div className="text-muted-foreground">
                {totalVotes.toLocaleString()} votes
              </div>
            )}
            {isEstimate && (
              <div className="text-amber-600">* Estimated (combined reporting unit)</div>
            )}
          </div>
        </>
      )}
    </div>
  );
});
