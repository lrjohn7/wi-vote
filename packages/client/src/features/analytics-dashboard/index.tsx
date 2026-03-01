import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ShieldAlert, Eye, Clock, Monitor, Smartphone, Tablet, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useChartTheme } from '@/shared/hooks/useChartTheme';
import { useAnalyticsDashboard } from './hooks/useAnalyticsDashboard';

const DAYS_OPTIONS = [7, 14, 30, 90] as const;

const DEVICE_COLORS = {
  desktop: '#6366f1',
  tablet: '#f59e0b',
  mobile: '#10b981',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatPath(path: string): string {
  if (path === '/') return 'Home';
  return path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnalyticsDashboard() {
  usePageTitle('Analytics');
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key') ?? '';
  const [days, setDays] = useState<number>(30);

  const { data, isLoading, isError, error } = useAnalyticsDashboard(key, days);
  const chart = useChartTheme();

  // No key or invalid key
  if (!key) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              A valid analytics key is required to view this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError && error?.message === '403') {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Invalid Key</h2>
            <p className="text-muted-foreground">
              The analytics key provided is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Site visitor analytics</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-content2/60 p-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  days === d
                    ? 'bg-background font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Eye className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {data.totals.pageviews.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {data.totals.sessions.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Session</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatDuration(data.avg_session_seconds)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visitors Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Visitors Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.visitors_by_day}>
                    <CartesianGrid stroke={chart.gridColor} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: chart.textColor, fontSize: 12 }}
                      tickFormatter={(d: string) => {
                        const date = new Date(d + 'T00:00:00');
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fill: chart.textColor, fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chart.tooltipBg,
                        border: `1px solid ${chart.tooltipBorder}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      name="Sessions"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pageviews"
                      name="Page Views"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bottom row: Top Pages + Device Breakdown */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, data.top_pages.length * 32)}>
                    <BarChart
                      data={data.top_pages}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <CartesianGrid stroke={chart.gridColor} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: chart.textColor, fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="path"
                        tick={{ fill: chart.textColor, fontSize: 12 }}
                        tickFormatter={formatPath}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chart.tooltipBg,
                          border: `1px solid ${chart.tooltipBorder}`,
                          borderRadius: 8,
                        }}
                        labelFormatter={formatPath}
                      />
                      <Bar dataKey="views" name="Views" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Desktop', value: data.device_breakdown.desktop },
                            { name: 'Tablet', value: data.device_breakdown.tablet },
                            { name: 'Mobile', value: data.device_breakdown.mobile },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill={DEVICE_COLORS.desktop} />
                          <Cell fill={DEVICE_COLORS.tablet} />
                          <Cell fill={DEVICE_COLORS.mobile} />
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chart.tooltipBg,
                            border: `1px solid ${chart.tooltipBorder}`,
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" style={{ color: DEVICE_COLORS.desktop }} />
                        <span className="text-sm">Desktop</span>
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {data.device_breakdown.desktop.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tablet className="h-4 w-4" style={{ color: DEVICE_COLORS.tablet }} />
                        <span className="text-sm">Tablet</span>
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {data.device_breakdown.tablet.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" style={{ color: DEVICE_COLORS.mobile }} />
                        <span className="text-sm">Mobile</span>
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {data.device_breakdown.mobile.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
