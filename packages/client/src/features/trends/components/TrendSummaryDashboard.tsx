import { memo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SummaryStats {
  demCount: number;
  repCount: number;
  incCount: number;
  avgDemSlope: number | null;
  avgRepSlope: number | null;
  minYear: number | null;
  maxYear: number | null;
}

interface TrendSummaryDashboardProps {
  stats: SummaryStats;
}

export const TrendSummaryDashboard = memo(function TrendSummaryDashboard({
  stats,
}: TrendSummaryDashboardProps) {
  const [methodOpen, setMethodOpen] = useState(false);

  const total = stats.demCount + stats.repCount + stats.incCount;
  if (total === 0) return null;

  const demPct = (stats.demCount / total) * 100;
  const repPct = (stats.repCount / total) * 100;
  const incPct = (stats.incCount / total) * 100;

  return (
    <div className="glass-panel absolute right-2 top-14 z-10 hidden w-48 p-2 sm:block sm:right-4 sm:top-16 sm:w-56 sm:p-3">
      <h4 className="mb-0.5 text-xs font-semibold text-foreground">Trend Summary</h4>
      <p className="mb-2 text-[9px] text-muted-foreground">
        {total.toLocaleString()} wards in view
      </p>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {repPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${repPct}%`, backgroundColor: 'var(--rep)' }}
          />
        )}
        {incPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${incPct}%`, backgroundColor: 'var(--content3)' }}
          />
        )}
        {demPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${demPct}%`, backgroundColor: 'var(--dem)' }}
          />
        )}
      </div>

      {/* Percentage labels */}
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span className="text-rep">{repPct.toFixed(1)}% R</span>
        <span>{incPct.toFixed(1)}% Inc</span>
        <span className="text-dem">{demPct.toFixed(1)}% D</span>
      </div>

      {/* Average slopes */}
      <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
        {stats.avgDemSlope != null && (
          <div className="flex justify-between">
            <span>Avg D-trending slope:</span>
            <span className="font-medium text-dem">
              +{Math.abs(stats.avgDemSlope).toFixed(2)}/cycle
            </span>
          </div>
        )}
        {stats.avgRepSlope != null && (
          <div className="flex justify-between">
            <span>Avg R-trending slope:</span>
            <span className="font-medium text-rep">
              +{Math.abs(stats.avgRepSlope).toFixed(2)}/cycle
            </span>
          </div>
        )}
      </div>

      {/* Methodology accordion */}
      <button
        onClick={() => setMethodOpen((v) => !v)}
        className="mt-2.5 flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        {methodOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>Methodology</span>
      </button>
      {methodOpen && (
        <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
          Trends are computed via ordinary least-squares linear regression on
          each ward's Democratic margin across{' '}
          {stats.minYear && stats.maxYear
            ? `${stats.minYear}\u2013${stats.maxYear}`
            : 'all available'}{' '}
          elections. A ward is classified as "trending" only when the regression
          slope is statistically significant (p &lt; 0.05). Wards with
          insufficient data or non-significant trends are marked "inconclusive."
        </p>
      )}
    </div>
  );
});
