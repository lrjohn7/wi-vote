import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getColorForMargin } from '@/shared/lib/colorScale';
import type { ReportCardPartisanLean } from '@/services/api';

interface PartisanLeanCardProps {
  lean: ReportCardPartisanLean;
}

export function PartisanLeanCard({ lean }: PartisanLeanCardProps) {
  const score = lean.score;
  const color = score != null ? getColorForMargin(score) : '#888';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Partisan Lean
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" style={{ color }}>
          {lean.label}
        </div>
        {lean.percentile != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            More Dem. than {lean.percentile.toFixed(0)}% of wards
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          Based on {lean.elections_used} presidential election{lean.elections_used !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
