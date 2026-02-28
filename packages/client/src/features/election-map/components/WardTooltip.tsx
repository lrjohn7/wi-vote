import { memo } from 'react';

interface WardTooltipProps {
  wardName: string;
  municipality: string;
  county: string;
  demPct?: number;
  repPct?: number;
  margin?: number;
  totalVotes?: number;
  isEstimate?: boolean;
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

  const borderColor = margin != null ? (margin > 0 ? '#2166ac' : '#b2182b') : '#cccccc';

  return (
    <div
      className="pointer-events-none absolute z-50 glass-panel border-l-4 px-3 py-2 text-sm transition-opacity duration-150"
      style={{
        left: x + 12,
        top: y + 12,
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
            <div style={{ width: `${demPct}%`, backgroundColor: '#2166ac' }} />
            <div style={{ width: `${repPct ?? 100 - demPct}%`, backgroundColor: '#b2182b' }} />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-[#2166ac]">DEM {demPct.toFixed(1)}%</span>
              <span className="text-[#b2182b]">REP {repPct?.toFixed(1)}%</span>
            </div>
            {marginLabel && (
              <div className="font-medium" style={{ color: margin && margin > 0 ? '#2166ac' : '#b2182b' }}>
                {marginLabel}
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
