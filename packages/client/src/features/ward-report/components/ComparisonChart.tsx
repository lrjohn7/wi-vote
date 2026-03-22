import { memo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChartTheme } from '@/shared/hooks/useChartTheme';
import { formatMargin } from '@/shared/lib/formatters';
import type { ReportCardComparison } from '@/services/api';

interface ComparisonChartProps {
  comparisons: ReportCardComparison[];
  county: string;
}

export const ComparisonChart = memo(function ComparisonChart({ comparisons, county }: ComparisonChartProps) {
  const chart = useChartTheme();

  if (comparisons.length === 0) {
    return null;
  }

  const data = comparisons.map((c) => ({
    year: c.election_year,
    ward: c.ward_margin,
    county: c.county_margin,
    state: c.state_margin,
  }));

  const firstYear = data[0]?.year;
  const lastYear = data[data.length - 1]?.year;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Presidential Margin: Ward vs. {county} Co. vs. State
        </CardTitle>
      </CardHeader>
      <CardContent role="figure" aria-label={`Presidential margin comparison chart, ${firstYear} to ${lastYear}. Compares ward margin to ${county} County and Wisconsin statewide.`}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="gradientWard" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.line1} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chart.line1} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} opacity={0.6} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: chart.textColor }}
              tickFormatter={(v) => String(v)}
              stroke={chart.axisColor}
            />
            <YAxis
              tick={{ fontSize: 12, fill: chart.textColor }}
              tickFormatter={formatMargin}
              stroke={chart.axisColor}
            />
            <Tooltip
              formatter={(value, name) => [
                formatMargin(Number(value)),
                name === 'ward' ? 'Ward' : name === 'county' ? `${county} Co.` : 'Wisconsin',
              ]}
              labelFormatter={(label) => `${label} Presidential`}
              contentStyle={{ backgroundColor: chart.tooltipBg, borderColor: chart.tooltipBorder, borderRadius: 8, backdropFilter: 'blur(8px)' }}
              itemStyle={{ color: chart.tooltipText }}
              labelStyle={{ color: chart.tooltipText }}
            />
            <Legend
              formatter={(value) =>
                value === 'ward' ? 'Ward' : value === 'county' ? `${county} Co.` : 'Wisconsin'
              }
            />
            <ReferenceLine y={0} stroke={chart.zeroLine} strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="ward"
              stroke={chart.line1}
              strokeWidth={2.5}
              fill="url(#gradientWard)"
              fillOpacity={1}
              dot={{ r: 4, fill: chart.line1, stroke: chart.line1 }}
              name="ward"
            />
            <Line
              type="monotone"
              dataKey="county"
              stroke={chart.line2}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="state"
              stroke={chart.line3}
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
