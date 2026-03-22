import { memo, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MapDataResponse } from '../hooks/useMapData';
import type { DisplayMetric } from '@/shared/lib/colorScale';
import { formatMargin } from '@/shared/lib/formatters';

interface WardDataTableProps {
  mapData: MapDataResponse;
  displayMetric: DisplayMetric;
  onWardClick?: (wardId: string) => void;
}

type SortKey = 'wardId' | 'margin' | 'demPct' | 'repPct' | 'totalVotes';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export const WardDataTable = memo(function WardDataTable({
  mapData,
  displayMetric,
  onWardClick,
}: WardDataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('margin');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const entries = Object.entries(mapData.data).map(([wardId, d]) => ({
      wardId,
      ...d,
    }));

    entries.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return entries;
  }, [mapData.data, sortKey, sortDir]);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'wardId' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    );
  };

  const metricLabel =
    displayMetric === 'margin' ? 'Margin' :
    displayMetric === 'demPct' ? 'Dem %' :
    displayMetric === 'repPct' ? 'Rep %' :
    displayMetric === 'turnout' ? 'Total Votes' : 'Total Votes';

  return (
    <div className="flex h-full flex-col">
      <div className="overflow-x-auto overflow-y-auto flex-1" style={{ maskImage: 'linear-gradient(to bottom, black calc(100% - 16px), transparent 100%)' }}>
        <table className="w-full text-sm" aria-label={`Ward election results for ${mapData.year} ${mapData.raceType}`}>
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="cursor-pointer select-none pb-2 pr-3 hover:text-foreground" onClick={() => toggleSort('wardId')} aria-sort={sortKey === 'wardId' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                Ward <SortIcon col="wardId" />
              </th>
              <th scope="col" className="cursor-pointer select-none pb-2 pr-3 text-right hover:text-foreground" onClick={() => toggleSort('margin')} aria-sort={sortKey === 'margin' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                Margin <SortIcon col="margin" />
              </th>
              <th scope="col" className="cursor-pointer select-none pb-2 pr-3 text-right hover:text-foreground" onClick={() => toggleSort('demPct')} aria-sort={sortKey === 'demPct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {mapData.demCandidate ?? 'Dem'} <SortIcon col="demPct" />
              </th>
              <th scope="col" className="cursor-pointer select-none pb-2 pr-3 text-right hover:text-foreground" onClick={() => toggleSort('repPct')} aria-sort={sortKey === 'repPct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {mapData.repCandidate ?? 'Rep'} <SortIcon col="repPct" />
              </th>
              <th scope="col" className="cursor-pointer select-none pb-2 text-right hover:text-foreground" onClick={() => toggleSort('totalVotes')} aria-sort={sortKey === 'totalVotes' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                Votes <SortIcon col="totalVotes" />
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const marginClass = row.margin > 0 ? 'text-dem' : row.margin < 0 ? 'text-rep' : 'text-muted-foreground';
              return (
                <tr
                  key={row.wardId}
                  className="cursor-pointer border-b border-border/30 transition-colors hover:bg-content2/50 last:border-b-0"
                  onClick={() => onWardClick?.(row.wardId)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onWardClick?.(row.wardId);
                    }
                  }}
                >
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    {row.wardId}
                    {row.isEstimate && <span className="ml-0.5 text-amber-500" title="Estimate">*</span>}
                  </td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums text-xs font-semibold ${marginClass}`}>
                    {formatMargin(row.margin)}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
                    {row.demPct.toFixed(1)}%
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
                    {row.repPct.toFixed(1)}%
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-xs text-muted-foreground">
                    {row.totalVotes.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 px-1 pt-2 text-xs text-muted-foreground">
          <span>
            {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-0.5 hover:bg-content2 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-0.5 hover:bg-content2 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="mt-1 text-[11px] text-muted-foreground">
        Sorted by {metricLabel} ({sortDir === 'desc' ? 'highest' : 'lowest'} first). * = estimated from combined reporting unit. Click a row to select ward on map.
      </p>
    </div>
  );
});
