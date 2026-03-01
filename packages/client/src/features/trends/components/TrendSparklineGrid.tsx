import { useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { useBulkWardElections } from '../hooks/useBulkWardElections';
import type { AreaTrendEntry, TrendElection } from '@/services/api';
import { POLITICAL_COLORS } from '@/shared/lib/politicalColors';

interface TrendSparklineGridProps {
  trends: AreaTrendEntry[];
  raceType?: string;
  pageSize?: number;
}

type SortMode = 'ward_id' | 'slope_asc' | 'slope_desc';

const MiniSparkline = memo(function MiniSparkline({
  wardId,
  elections,
  raceType,
  direction,
  slope,
}: {
  wardId: string;
  elections?: TrendElection[];
  raceType?: string;
  direction: string;
  slope: number | null;
}) {
  const color =
    direction === 'more_democratic'
      ? POLITICAL_COLORS.dem
      : direction === 'more_republican'
        ? POLITICAL_COLORS.rep
        : POLITICAL_COLORS.neutral;

  // Filter elections for the given race type and sort by year
  const points = useMemo(() => {
    if (!elections || elections.length === 0) return [];
    const filtered = raceType
      ? elections.filter((e) => e.race_type === raceType)
      : elections;
    return filtered.sort((a, b) => a.year - b.year);
  }, [elections, raceType]);

  const width = 120;
  const height = 40;
  const padX = 8;
  const padY = 6;

  // If we have real data points, draw the actual margin path
  if (points.length >= 2) {
    const margins = points.map((p) => p.margin);
    const minMargin = Math.min(...margins);
    const maxMargin = Math.max(...margins);
    const range = maxMargin - minMargin || 1;

    const xScale = (width - padX * 2) / (points.length - 1);
    const yScale = (height - padY * 2) / range;

    const pathPoints = points.map((p, i) => {
      const x = padX + i * xScale;
      const y = height - padY - (p.margin - minMargin) * yScale;
      return `${x},${y}`;
    });

    const pathD = `M ${pathPoints.join(' L ')}`;

    const dirLabel = direction === 'more_democratic' ? 'trending Democratic' : direction === 'more_republican' ? 'trending Republican' : 'inconclusive trend';

    return (
      <svg width={width} height={height} className="block" role="img" aria-label={`${wardId}: ${dirLabel}, margin from ${points[0].margin.toFixed(1)} to ${points[points.length - 1].margin.toFixed(1)}`}>
        {/* Zero line if margin crosses 0 */}
        {minMargin < 0 && maxMargin > 0 && (
          <line
            x1={padX}
            y1={height - padY - (0 - minMargin) * yScale}
            x2={width - padX}
            y2={height - padY - (0 - minMargin) * yScale}
            stroke="#d4d4d4"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        )}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Start and end dots */}
        {pathPoints.length > 0 && (
          <>
            <circle cx={padX} cy={Number(pathPoints[0].split(',')[1])} r={2} fill={color} />
            <circle
              cx={padX + (points.length - 1) * xScale}
              cy={Number(pathPoints[pathPoints.length - 1].split(',')[1])}
              r={2}
              fill={color}
            />
          </>
        )}
      </svg>
    );
  }

  // Fallback: simple 2-point line based on slope
  const slopeVal = slope ?? 0;
  const startY = 20 - slopeVal * 5;
  const endY = 20 + slopeVal * 5;
  const clampStart = Math.max(4, Math.min(36, startY));
  const clampEnd = Math.max(4, Math.min(36, endY));

  const dirLabel = direction === 'more_democratic' ? 'trending Democratic' : direction === 'more_republican' ? 'trending Republican' : 'inconclusive trend';

  return (
    <svg width={width} height={height} className="block" role="img" aria-label={`${wardId}: ${dirLabel}, slope ${slope?.toFixed(2) ?? 'unknown'}`}>
      <line x1={10} y1={clampStart} x2={110} y2={clampEnd} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={10} cy={clampStart} r={2.5} fill={color} />
      <circle cx={110} cy={clampEnd} r={2.5} fill={color} />
    </svg>
  );
});

export function TrendSparklineGrid({
  trends,
  raceType = 'president',
  pageSize = 50,
}: TrendSparklineGridProps) {
  const [page, setPage] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('ward_id');

  // Sort trends
  const sorted = useMemo(() => {
    const items = [...trends];
    switch (sortMode) {
      case 'slope_asc':
        items.sort((a, b) => (a.slope ?? 0) - (b.slope ?? 0));
        break;
      case 'slope_desc':
        items.sort((a, b) => (b.slope ?? 0) - (a.slope ?? 0));
        break;
      default:
        items.sort((a, b) => a.ward_id.localeCompare(b.ward_id));
        break;
    }
    return items;
  }, [trends, sortMode]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const displayed = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // Fetch real election histories for the displayed wards
  const displayedWardIds = useMemo(() => displayed.map((t) => t.ward_id), [displayed]);
  const { data: bulkElections } = useBulkWardElections(displayedWardIds);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No trend data to display.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Sort:</span>
        <div className="flex gap-1" role="group" aria-label="Sort sparklines">
          {([
            ['ward_id', 'Ward ID'],
            ['slope_desc', 'Most D'],
            ['slope_asc', 'Most R'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              aria-pressed={sortMode === mode}
              className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                sortMode === mode ? 'bg-content2 font-medium' : 'text-muted-foreground hover:bg-content2'
              }`}
              onClick={() => { setSortMode(mode); setPage(0); }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {sorted.length.toLocaleString()} wards
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {displayed.map((t) => (
          <div
            key={t.ward_id}
            className="rounded-xl border border-border/30 bg-content1 p-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
            title={`${t.ward_id}: ${t.direction} (slope: ${t.slope?.toFixed(2) ?? 'N/A'})`}
          >
            <MiniSparkline
              wardId={t.ward_id}
              elections={bulkElections?.[t.ward_id]}
              raceType={raceType}
              direction={t.direction}
              slope={t.slope}
            />
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
              {t.ward_id}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
