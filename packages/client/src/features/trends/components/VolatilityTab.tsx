import { useMemo } from 'react';
import { useVolatility } from '../hooks/useVolatility';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import type { WardVolatility } from '../hooks/useVolatility';

function volatilityColor(value: number, max: number): string {
  const t = Math.min(value / max, 1);
  if (t < 0.33) return '#22c55e';
  if (t < 0.66) return '#eab308';
  return '#ef4444';
}

function marginColor(margin: number): string {
  if (margin > 5) return '#2166ac';
  if (margin > 0) return '#67a9cf';
  if (margin > -5) return '#ef8a62';
  return '#b2182b';
}

interface RankedWard {
  ward_id: string;
  data: WardVolatility;
}

export function VolatilityTab() {
  const { data, isLoading, isError, error, refetch } = useVolatility('president');

  const { top50, avgVolatility, mostVolatile, mostStable, maxVol } = useMemo(() => {
    if (!data?.data) return { top50: [], avgVolatility: 0, mostVolatile: null, mostStable: null, maxVol: 1 };

    const entries: RankedWard[] = Object.entries(data.data).map(([id, d]) => ({ ward_id: id, data: d }));
    entries.sort((a, b) => b.data.volatility - a.data.volatility);

    const sum = entries.reduce((acc, e) => acc + e.data.volatility, 0);
    const avg = entries.length > 0 ? sum / entries.length : 0;

    return {
      top50: entries.slice(0, 50),
      avgVolatility: Math.round(avg * 100) / 100,
      mostVolatile: entries[0] ?? null,
      mostStable: entries[entries.length - 1] ?? null,
      maxVol: entries[0]?.data.volatility ?? 1,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          { [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-content2" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-content2" />
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState error={error!} onRetry={() => refetch()} />;
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Wards Analyzed" value={data.ward_count.toLocaleString()} />
        <SummaryCard label="Avg Volatility" value={`${avgVolatility.toFixed(2)}pt`} />
        <SummaryCard
          label="Most Volatile"
          value={mostVolatile ? `${mostVolatile.data.volatility}pt` : '--'}
          subtitle={mostVolatile?.data.ward_name}
        />
        <SummaryCard
          label="Most Stable"
          value={mostStable ? `${mostStable.data.volatility}pt` : '--'}
          subtitle={mostStable?.data.ward_name}
        />
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-border/30 bg-content1 px-4 py-2 text-xs text-muted-foreground">
        Volatility measures the standard deviation of a ward&apos;s partisan margin
        across all presidential elections. Higher values mean the ward swings
        more between elections. Only wards with 3+ elections are included.
      </div>

      {/* Ranked Table */}
      <div className="rounded-xl border border-border/30 bg-content1">
        <div className="border-b border-border/20 px-4 py-2">
          <h3 className="text-sm font-semibold">Top 50 Most Volatile Wards</h3>
          <p className="text-xs text-muted-foreground">Presidential elections</p>
        </div>
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-content1">
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Ward</th>
                <th className="px-4 py-2 text-right font-medium">Volatility</th>
                <th className="px-4 py-2 text-right font-medium">Avg Margin</th>
                <th className="px-4 py-2 text-right font-medium">Range</th>
                <th className="px-4 py-2 text-right font-medium">Elections</th>
              </tr>
            </thead>
            <tbody>
              {top50.map((ward, idx) => (
                <tr key={ward.ward_id} className="border-t border-border/10 hover:bg-content2/50 transition-colors">
                  <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{ward.data.ward_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ward.data.municipality}, {ward.data.county} Co.
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-content2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((ward.data.volatility / maxVol) * 100, 100)}%`,
                            backgroundColor: volatilityColor(ward.data.volatility, maxVol),
                          }}
                        />
                      </div>
                      <span className="tabular-nums w-10 text-right font-medium">
                        {ward.data.volatility.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className="tabular-nums font-medium"
                      style={{ color: marginColor(ward.data.mean_margin) }}
                    >
                      {ward.data.mean_margin > 0 ? '+' : ''}
                      {ward.data.mean_margin.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-right">
                    {ward.data.range.toFixed(1)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-right">
                    {ward.data.election_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Summary stat card */
function SummaryCard({ label, value, subtitle }: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-content1 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
