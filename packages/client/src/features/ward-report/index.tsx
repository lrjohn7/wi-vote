import { useParams } from 'react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useReportCard } from './hooks/useReportCard';
import { useWardDemographics } from '@/shared/hooks/useWardDemographics';
import { DemographicsSection } from '@/shared/components/DemographicsSection';
import { WardFinder } from './components/WardFinder';
import { ReportCardHeader } from './components/ReportCardHeader';
import { PartisanLeanCard } from './components/PartisanLeanCard';
import { TrendCard } from './components/TrendCard';
import { ComparisonChart } from './components/ComparisonChart';
import { TurnoutChart } from './components/TurnoutChart';
import { ElectionHistoryTable } from './components/ElectionHistoryTable';

export default function WardReport() {
  const { wardId } = useParams<{ wardId: string }>();
  usePageTitle(wardId ? 'Ward Report' : 'My Ward');
  const { data: report, isLoading, error } = useReportCard(wardId ?? null);
  const { data: demographics } = useWardDemographics(wardId ?? null);

  // No ward selected — show search landing page
  if (!wardId) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6">
          <WardFinder />
        </div>
      </ScrollArea>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading report card...</p>
      </div>
    );
  }

  // Error
  if (error || !report) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Failed to load report card' : 'Ward not found'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ward ID: {wardId}
          </p>
        </div>
      </div>
    );
  }

  // Compute average turnout for summary card
  const avgTurnout =
    report.turnout.length > 0
      ? Math.round(
          report.turnout.reduce((sum, t) => sum + t.total_votes, 0) / report.turnout.length,
        )
      : null;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header */}
        <ReportCardHeader metadata={report.metadata} hasEstimates={report.has_estimates} />

        <Separator />

        {/* Summary cards row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PartisanLeanCard lean={report.partisan_lean} />
          <TrendCard trend={report.trend} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Turnout
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {avgTurnout != null ? avgTurnout.toLocaleString() : 'N/A'}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                votes per presidential election
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Across {report.turnout.length} election{report.turnout.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demographics */}
        {demographics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Census Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DemographicsSection data={demographics} />
            </CardContent>
          </Card>
        )}

        {/* Election history table */}
        <ElectionHistoryTable elections={report.elections} />

        {/* Comparison chart */}
        <ComparisonChart
          comparisons={report.comparisons}
          county={report.metadata.county}
        />

        {/* Turnout chart */}
        <TurnoutChart turnout={report.turnout} elections={report.elections} />

        {/* Estimated data disclosure */}
        {report.has_estimates && (
          <p className="text-sm text-amber-600">
            * Some data for this ward comes from a combined reporting unit. Vote totals marked with
            * are population-weighted estimates, not direct counts. County and state totals remain
            exact.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
