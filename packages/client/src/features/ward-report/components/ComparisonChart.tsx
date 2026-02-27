import {
  LineChart,
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
import type { ReportCardComparison } from '@/services/api';

interface ComparisonChartProps {
  comparisons: ReportCardComparison[];
  county: string;
}

export function ComparisonChart({ comparisons, county }: ComparisonChartProps) {
  if (comparisons.length === 0) {
    return null;
  }

  const data = comparisons.map((c) => ({
    year: c.election_year,
    ward: c.ward_margin,
    county: c.county_margin,
    state: c.state_margin,
  }));

  const formatMargin = (value: number) => {
    if (value > 0) return `D+${value.toFixed(1)}`;
    if (value < 0) return `R+${Math.abs(value).toFixed(1)}`;
    return 'Even';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Presidential Margin: Ward vs. {county} Co. vs. State
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatMargin}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatMargin(value),
                name === 'ward' ? 'Ward' : name === 'county' ? `${county} Co.` : 'Wisconsin',
              ]}
              labelFormatter={(label) => `${label} Presidential`}
            />
            <Legend
              formatter={(value) =>
                value === 'ward' ? 'Ward' : value === 'county' ? `${county} Co.` : 'Wisconsin'
              }
            />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="ward"
              stroke="#333"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="county"
              stroke="#8884d8"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="state"
              stroke="#82ca9d"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
