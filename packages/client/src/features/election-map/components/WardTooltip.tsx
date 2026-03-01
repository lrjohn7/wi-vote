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

  // Clamp tooltip to viewport bounds
  const tooltipWidth = 220;
  const tooltipHeight = 140;
  const clampedX = Math.min(x + 12, (typeof window !== 'undefined' ? window.innerWidth : 800) - tooltipWidth);
  const clampedY = Math.min(Math.max(y + 12, tooltipHeight / 2), (typeof window !== 'undefined' ? window.innerHeight : 600) - tooltipHeight / 2);

  return (
    <div
      className="pointer-events-none absolute z-50 hidden glass-panel border-l-4 px-3 py-2 text-sm transition-opacity duration-150 md:block"
      style={{
        left: clampedX,
        top: clampedY,
        transform: 'translate(0, -50%)',
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
          <div className="my-1.5 flex h-1.5 overflow-hidden rounded-full">
            <div style={{ width: `${demPct}%`, backgroundColor: 'var(--dem)' }} />
            <div style={{ width: `${repPct ?? 100 - demPct}%`, backgroundColor: 'var(--rep)' }} />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-dem">DEM {demPct.toFixed(1)}%</span>
              <span className="text-rep">REP {repPct?.toFixed(1)}%</span>
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
