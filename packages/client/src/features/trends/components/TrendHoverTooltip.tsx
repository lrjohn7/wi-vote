import { memo } from 'react';
import { TrendClassificationBadge } from './TrendClassificationBadge';
import type { TrendClassificationEntry } from '@/services/api';

interface TrendHoverTooltipProps {
  point: { x: number; y: number } | null;
  properties: Record<string, unknown> | null;
  classification: TrendClassificationEntry | null;
}

export const TrendHoverTooltip = memo(function TrendHoverTooltip({
  point,
  properties,
  classification,
}: TrendHoverTooltipProps) {
  if (!point || !properties) return null;

  const wardName = String(properties.ward_name ?? properties.WARDNAME ?? 'Unknown Ward');
  const municipality = String(properties.municipality ?? properties.MCD_NAME ?? '');
  const county = String(properties.county ?? properties.CNTY_NAME ?? '');

  const borderColor =
    classification?.direction === 'more_democratic'
      ? '#2166ac'
      : classification?.direction === 'more_republican'
        ? '#b2182b'
        : '#a3a3a3';

  return (
    <div
      role="tooltip"
      className="glass-panel pointer-events-none fixed z-50 min-w-[180px] max-w-[240px] border-l-4 p-2.5"
      style={{
        left: point.x + 12,
        top: point.y - 10,
        borderLeftColor: borderColor,
      }}
    >
      {/* Ward identity */}
      <p className="text-xs font-semibold leading-tight">{wardName}</p>
      {(municipality || county) && (
        <p className="text-[10px] text-muted-foreground">
          {[municipality, county].filter(Boolean).join(', ')}
        </p>
      )}

      {classification ? (
        <div className="mt-1.5 space-y-1">
          <TrendClassificationBadge
            direction={classification.direction}
            slope={classification.slope}
          />

          {classification.slope != null && (
            <p className="text-[10px] text-muted-foreground">
              {Math.abs(classification.slope).toFixed(2)} pts/cycle shift
            </p>
          )}

          {classification.elections_analyzed != null && (
            <p className="text-[10px] text-muted-foreground">
              {classification.elections_analyzed} elections
              {classification.start_year != null &&
                classification.end_year != null &&
                ` (${classification.start_year}\u2013${classification.end_year})`}
            </p>
          )}

          {classification.p_value != null && (
            <p className="text-[10px] text-muted-foreground">
              p = {classification.p_value < 0.001
                ? '<0.001'
                : classification.p_value.toFixed(3)}
              {classification.p_value < 0.05
                ? ' (significant)'
                : ' (not significant)'}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-muted-foreground">No trend data</p>
      )}
    </div>
  );
});
