import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportCardTurnout, ReportCardElection } from '@/services/api';

interface TurnoutChartProps {
  turnout: ReportCardTurnout[];
  elections: ReportCardElection[];
}

export function TurnoutChart({ turnout, elections }: TurnoutChartProps) {
  if (turnout.length === 0) {
    return null;
  }

  // Build a map of year -> margin to color bars by winner
  const marginByYear = new Map<number, number>();
  for (const e of elections) {
    if (e.race_type === turnout[0]?.race_type) {
      marginByYear.set(e.election_year, e.margin);
    }
  }

  const data = turnout.map((t) => ({
    year: t.election_year,
    votes: t.total_votes,
    margin: marginByYear.get(t.election_year) ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Presidential Turnout</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => String(v)}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString(), 'Total Votes']}
              labelFormatter={(label) => `${label} Presidential`}
            />
            <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.year}
                  fill={entry.margin > 0 ? '#2166ac' : '#b2182b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
