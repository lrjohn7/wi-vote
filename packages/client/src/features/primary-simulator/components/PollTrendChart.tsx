import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePrimaryStore } from '@/stores/primaryStore';

/**
 * Format an ISO date (YYYY-MM-DD) to a compact "M/D" string.
 */
function formatChartDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Custom tooltip component for the poll trend chart.
 */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-panel rounded px-2 py-1.5 shadow-lg border border-border/30">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[10px]">{entry.name}</span>
          <span className="text-[10px] font-mono tabular-nums ml-auto">
            {entry.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * PollTrendChart -- small Recharts line chart showing candidate support
 * over time across enabled polls.
 *
 * Renders only when there are 2 or more enabled polls. Each active
 * candidate gets a line in their assigned color. X-axis shows poll end
 * dates formatted as "M/D".
 */
export const PollTrendChart = memo(function PollTrendChart() {
  const polls = usePrimaryStore((s) => s.polls);
  const candidates = usePrimaryStore((s) => s.candidates);

  // Active candidates only
  const activeCandidates = useMemo(
    () => candidates.filter((c) => c.isActive),
    [candidates],
  );

  // Filter to enabled polls sorted by end date
  const enabledPolls = useMemo(
    () =>
      [...polls]
        .filter((p) => p.isEnabled)
        .sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [polls],
  );

  // Build chart data: one entry per poll with date + per-candidate pcts
  const chartData = useMemo(() => {
    return enabledPolls.map((poll) => {
      const point: Record<string, string | number> = {
        date: formatChartDate(poll.endDate),
      };
      for (const c of activeCandidates) {
        const pct = poll.candidates[c.id];
        if (pct != null && pct >= 0) {
          point[c.id] = pct;
        }
      }
      return point;
    });
  }, [enabledPolls, activeCandidates]);

  // Need at least 2 data points for a meaningful trend
  if (enabledPolls.length < 2) {
    return null;
  }

  return (
    <div className="glass-panel rounded-lg p-3">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Poll Trend
      </h3>

      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'currentColor' }}
            tickLine={false}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 9, fill: 'currentColor' }}
            tickLine={false}
            axisLine={false}
            width={25}
            className="text-muted-foreground"
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
          />
          {activeCandidates.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.id}
              name={c.shortName}
              stroke={c.color}
              strokeWidth={1.5}
              dot={{ r: 3, fill: c.color, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: c.color, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
