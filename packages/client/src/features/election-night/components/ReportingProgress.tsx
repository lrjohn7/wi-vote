import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LiveElection } from '../hooks/useLiveResults';

interface ReportingProgressProps {
  election: LiveElection;
}

export const ReportingProgress = memo(function ReportingProgress({
  election,
}: ReportingProgressProps) {
  const lastUpdate = new Date(election.last_updated);
  const timeAgo = getTimeAgo(lastUpdate);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Reporting Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-end justify-between">
          <div className="text-3xl font-bold tabular-nums">
            {election.pct_reporting.toFixed(1)}%
          </div>
          {election.is_active && (
            <span className="flex items-center gap-1.5 text-xs text-green-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          )}
          {!election.is_active && (
            <span className="text-xs text-muted-foreground">Final</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-content2">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-1000"
            style={{ width: `${election.pct_reporting}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {election.wards_reporting.toLocaleString()} of{' '}
            {election.total_wards.toLocaleString()} wards
          </span>
          <span>Updated {timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
});

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}
