import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WARD_VINTAGES } from '../hooks/useVintageBoundaries';

interface BoundaryStatsProps {
  selectedVintage: number;
  comparisonVintage: number | null;
  selectedFeatureCount: number;
  comparisonFeatureCount: number;
}

export const BoundaryStats = memo(function BoundaryStats({
  selectedVintage,
  comparisonVintage,
  selectedFeatureCount,
  comparisonFeatureCount,
}: BoundaryStatsProps) {
  const selectedInfo = WARD_VINTAGES.find((v) => v.vintage === selectedVintage);
  const comparisonInfo = comparisonVintage
    ? WARD_VINTAGES.find((v) => v.vintage === comparisonVintage)
    : null;
  const diff = comparisonVintage
    ? selectedFeatureCount - comparisonFeatureCount
    : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {selectedInfo?.label ?? `${selectedVintage} Wards`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {selectedFeatureCount > 0
              ? selectedFeatureCount.toLocaleString()
              : '—'}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">total wards</p>
        </CardContent>
      </Card>

      {comparisonVintage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-500">
              {comparisonInfo?.label ?? `${comparisonVintage} Wards`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {comparisonFeatureCount > 0
                ? comparisonFeatureCount.toLocaleString()
                : '—'}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">total wards</p>
          </CardContent>
        </Card>
      )}

      {diff !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${
                diff > 0 ? 'text-dem' : diff < 0 ? 'text-rep' : ''
              }`}
            >
              {diff > 0 ? '+' : ''}
              {diff.toLocaleString()}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {diff > 0 ? 'wards added' : diff < 0 ? 'wards removed' : 'no change'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
