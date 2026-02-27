interface AreaTrendSummaryProps {
  summary: {
    more_democratic: number;
    more_republican: number;
    inconclusive: number;
  };
  totalWards: number;
}

export function AreaTrendSummary({ summary, totalWards }: AreaTrendSummaryProps) {
  if (totalWards === 0) {
    return <p className="text-sm text-muted-foreground">No trend data available.</p>;
  }

  const demPct = (summary.more_democratic / totalWards) * 100;
  const repPct = (summary.more_republican / totalWards) * 100;
  const incPct = (summary.inconclusive / totalWards) * 100;

  return (
    <div className="space-y-2">
      {/* Stacked horizontal bar */}
      <div className="flex h-6 overflow-hidden rounded-full">
        {demPct > 0 && (
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${demPct}%`, backgroundColor: '#2166ac' }}
          >
            {demPct >= 8 ? `${summary.more_democratic}` : ''}
          </div>
        )}
        {incPct > 0 && (
          <div
            className="flex items-center justify-center text-[10px] font-medium text-gray-700"
            style={{ width: `${incPct}%`, backgroundColor: '#d4d4d4' }}
          >
            {incPct >= 8 ? `${summary.inconclusive}` : ''}
          </div>
        )}
        {repPct > 0 && (
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${repPct}%`, backgroundColor: '#b2182b' }}
          >
            {repPct >= 8 ? `${summary.more_republican}` : ''}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: '#2166ac' }} />
          Trending D: {summary.more_democratic}
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: '#b2182b' }} />
          Trending R: {summary.more_republican}
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: '#d4d4d4' }} />
          Inconclusive: {summary.inconclusive}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{totalWards} wards analyzed</p>
    </div>
  );
}
