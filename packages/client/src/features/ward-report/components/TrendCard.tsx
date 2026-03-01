import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportCardTrend } from '@/services/api';

interface TrendCardProps {
  trend: ReportCardTrend;
}

const TREND_CONFIG = {
  more_democratic: {
    label: 'Trending Democratic',
    Icon: TrendingUp,
    colorClass: 'text-dem',
  },
  more_republican: {
    label: 'Trending Republican',
    Icon: TrendingDown,
    colorClass: 'text-rep',
  },
  inconclusive: {
    label: 'No Clear Trend',
    Icon: Minus,
    colorClass: 'text-muted-foreground',
  },
} as const;

export function TrendCard({ trend }: TrendCardProps) {
  const config = TREND_CONFIG[trend.direction];
  const { Icon } = config;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon className={`h-6 w-6 ${config.colorClass}`} />
          <span className={`text-lg font-semibold ${config.colorClass}`}>
            {config.label}
          </span>
        </div>
        {trend.slope != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            {trend.slope > 0 ? '+' : ''}
            {trend.slope.toFixed(2)} margin pts/cycle
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {trend.elections_analyzed > 0 ? (
            <>
              {trend.start_year}&#8211;{trend.end_year} ({trend.elections_analyzed} elections)
              {trend.is_significant && (
                <span className="ml-1 font-medium text-foreground">
                  p&lt;0.05
                </span>
              )}
            </>
          ) : (
            'Insufficient data'
          )}
        </p>
      </CardContent>
    </Card>
  );
}
