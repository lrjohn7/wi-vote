import type { AreaTrendEntry } from '@/services/api';

interface TrendSparklineGridProps {
  trends: AreaTrendEntry[];
  maxItems?: number;
}

function MiniSparkline({
  direction,
  slope,
}: {
  direction: string;
  slope: number | null;
}) {
  const color =
    direction === 'more_democratic'
      ? '#2166ac'
      : direction === 'more_republican'
        ? '#b2182b'
        : '#999';

  // Generate a simple 2-point line path based on slope
  const slopeVal = slope ?? 0;
  const startY = 20 - slopeVal * 5; // Scale slope for visual
  const endY = 20 + slopeVal * 5;
  const clampStart = Math.max(4, Math.min(36, startY));
  const clampEnd = Math.max(4, Math.min(36, endY));

  return (
    <svg width={120} height={40} className="block">
      <line
        x1={10}
        y1={clampStart}
        x2={110}
        y2={clampEnd}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={10} cy={clampStart} r={2.5} fill={color} />
      <circle cx={110} cy={clampEnd} r={2.5} fill={color} />
    </svg>
  );
}

export function TrendSparklineGrid({ trends, maxItems = 100 }: TrendSparklineGridProps) {
  const displayed = trends.slice(0, maxItems);

  if (displayed.length === 0) {
    return <p className="text-sm text-muted-foreground">No trend data to display.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {displayed.map((t) => (
        <div
          key={t.ward_id}
          className="rounded border p-1.5"
          title={`${t.ward_id}: ${t.direction} (slope: ${t.slope?.toFixed(2) ?? 'N/A'})`}
        >
          <MiniSparkline direction={t.direction} slope={t.slope} />
          <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
            {t.ward_id}
          </p>
        </div>
      ))}
      {trends.length > maxItems && (
        <p className="col-span-full text-xs text-muted-foreground">
          Showing {maxItems} of {trends.length} wards.
        </p>
      )}
    </div>
  );
}
