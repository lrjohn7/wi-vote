import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

interface MetricCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  /** Percentage or absolute change text, e.g. "+5.2%" */
  change?: string;
  changeType?: 'positive' | 'negative';
  /** Optional sparkline data: array of { v: number } */
  sparklineData?: { v: number }[];
  /** Color class for icon badge, e.g. "bg-blue-500/10 text-blue-600" */
  color?: string;
  /** Override value color class */
  valueColor?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  change,
  changeType,
  sparklineData,
  color = 'bg-muted text-muted-foreground',
  valueColor,
}: MetricCardProps) {
  const sparkColor =
    changeType === 'positive' ? '#4ade80' : changeType === 'negative' ? '#f87171' : '#a3a3a3';

  return (
    <div className="group rounded-xl border border-border/50 bg-content2/30 p-4 transition-all duration-200 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={`inline-flex rounded-lg p-1.5 ${color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          </div>
          <div className={`mt-2 text-3xl font-bold tracking-tight ${valueColor ?? ''}`}>
            {value}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          )}
          {change && (
            <div className="mt-1.5 flex items-center gap-1">
              {changeType === 'positive' && <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
              {changeType === 'negative' && <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />}
              <span
                className={`text-xs font-medium ${
                  changeType === 'positive'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                }`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="h-10 w-20 flex-shrink-0" role="img" aria-label={`Trend sparkline for ${label}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
