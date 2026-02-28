import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { TrendElection, WardTrendInfo } from '@/services/api';

interface TrendTimeSeriesProps {
  elections: TrendElection[];
  raceType: string;
  trend?: WardTrendInfo;
}

export const TrendTimeSeries = memo(function TrendTimeSeries({ elections, raceType, trend }: TrendTimeSeriesProps) {
  // Filter elections to the selected race type
  const filtered = elections
    .filter((e) => e.race_type === raceType)
    .sort((a, b) => a.year - b.year);

  if (filtered.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No election data for this race type.
      </p>
    );
  }

  // Build chart data with optional trend line
  const data = filtered.map((e) => {
    const point: Record<string, number> = {
      year: e.year,
      margin: parseFloat(e.margin.toFixed(2)),
    };

    // Add regression trend line point if we have slope data
    if (trend?.slope != null && trend.start_year != null) {
      const startMargin = filtered[0]?.margin ?? 0;
      point.trendLine = parseFloat(
        (startMargin + trend.slope * (e.year - filtered[0].year)).toFixed(2),
      );
    }

    return point;
  });

  const directionColor =
    trend?.direction === 'more_democratic'
      ? '#2166ac'
      : trend?.direction === 'more_republican'
        ? '#b2182b'
        : '#888';

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11 }}
          tickFormatter={(y: number) => String(y)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) =>
            v > 0 ? `D+${v}` : v < 0 ? `R+${Math.abs(v)}` : '0'
          }
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(value: number) =>
            value > 0 ? `D+${value.toFixed(1)}` : value < 0 ? `R+${Math.abs(value).toFixed(1)}` : 'Even'
          }
          labelFormatter={(label: number) => `${label}`}
        />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="margin"
          stroke={directionColor}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Margin"
        />
        {trend?.slope != null && (
          <Line
            type="monotone"
            dataKey="trendLine"
            stroke={directionColor}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="Trend"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
});
