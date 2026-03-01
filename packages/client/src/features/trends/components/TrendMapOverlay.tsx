import { useMemo, useState, useCallback, memo } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { useTrendClassifications } from '../hooks/useTrends';
import type { MapDataResponse, WardMapEntry } from '@/features/election-map/hooks/useMapData';
import type { TrendClassificationEntry } from '@/services/api';
import { TrendInfoBanner } from './TrendInfoBanner';
import { TrendLegend } from './TrendLegend';
import { TrendHoverTooltip } from './TrendHoverTooltip';
import { TrendSummaryDashboard } from './TrendSummaryDashboard';

interface HoverState {
  wardId: string;
  properties: Record<string, unknown>;
  point: { x: number; y: number };
}

/**
 * Map trend directions to a demPct scale for coloring:
 * - more_democratic: high demPct (blue)
 * - more_republican: low demPct (red)
 * - inconclusive: 50 (gray)
 * The slope magnitude controls intensity.
 */
function trendToMapData(
  classifications: Record<string, TrendClassificationEntry>,
): MapDataResponse {
  const data: Record<string, WardMapEntry> = {};

  for (const [wardId, info] of Object.entries(classifications)) {
    const slope = info.slope ?? 0;
    let demPct: number;

    if (info.direction === 'more_democratic') {
      // Map positive slope (0-3+) to demPct 55-80
      demPct = 55 + Math.min(Math.abs(slope) * 8, 25);
    } else if (info.direction === 'more_republican') {
      // Map negative slope to demPct 20-45
      demPct = 45 - Math.min(Math.abs(slope) * 8, 25);
    } else {
      demPct = 50;
    }

    data[wardId] = {
      demPct,
      repPct: 100 - demPct,
      margin: (demPct - 50) * 2,
      totalVotes: 0,
      demVotes: 0,
      repVotes: 0,
      isEstimate: false,
    };
  }

  return {
    year: 0,
    raceType: 'trend',
    wardCount: Object.keys(data).length,
    data,
  };
}

interface SummaryStats {
  demCount: number;
  repCount: number;
  incCount: number;
  avgDemSlope: number | null;
  avgRepSlope: number | null;
  minYear: number | null;
  maxYear: number | null;
}

function computeSummary(
  classifications: Record<string, TrendClassificationEntry>,
): SummaryStats {
  let demCount = 0;
  let repCount = 0;
  let incCount = 0;
  let demSlopeSum = 0;
  let demSlopeN = 0;
  let repSlopeSum = 0;
  let repSlopeN = 0;
  let minYear: number | null = null;
  let maxYear: number | null = null;

  for (const entry of Object.values(classifications)) {
    if (entry.direction === 'more_democratic') {
      demCount++;
      if (entry.slope != null) {
        demSlopeSum += entry.slope;
        demSlopeN++;
      }
    } else if (entry.direction === 'more_republican') {
      repCount++;
      if (entry.slope != null) {
        repSlopeSum += entry.slope;
        repSlopeN++;
      }
    } else {
      incCount++;
    }

    if (entry.start_year != null) {
      if (minYear == null || entry.start_year < minYear) minYear = entry.start_year;
    }
    if (entry.end_year != null) {
      if (maxYear == null || entry.end_year > maxYear) maxYear = entry.end_year;
    }
  }

  return {
    demCount,
    repCount,
    incCount,
    avgDemSlope: demSlopeN > 0 ? demSlopeSum / demSlopeN : null,
    avgRepSlope: repSlopeN > 0 ? repSlopeSum / repSlopeN : null,
    minYear,
    maxYear,
  };
}

const EMPTY_STATS: SummaryStats = {
  demCount: 0, repCount: 0, incCount: 0,
  avgDemSlope: null, avgRepSlope: null, minYear: null, maxYear: null,
};

export const TrendMapOverlay = memo(function TrendMapOverlay() {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [visibleWardIds, setVisibleWardIds] = useState<string[]>([]);
  const { data: classData, isLoading: classLoading, isError: classError, error: classErrorObj, refetch: classRefetch } = useTrendClassifications('president');

  const mapData = useMemo(() => {
    if (!classData?.classifications) return undefined;
    return trendToMapData(classData.classifications);
  }, [classData]);

  // Viewport-scoped summary: only count wards currently visible on the map
  const viewportStats = useMemo<SummaryStats>(() => {
    if (!classData?.classifications || visibleWardIds.length === 0) return EMPTY_STATS;
    const filtered: Record<string, TrendClassificationEntry> = {};
    for (const id of visibleWardIds) {
      if (classData.classifications[id]) {
        filtered[id] = classData.classifications[id];
      }
    }
    return computeSummary(filtered);
  }, [classData, visibleWardIds]);

  const handleWardClick = useCallback(() => {
    // No-op for trend map; could add detail panel in future
  }, []);

  const handleWardHover = useCallback(
    (
      wardId: string | null,
      properties: Record<string, unknown> | null,
      point: { x: number; y: number } | null,
    ) => {
      if (wardId && properties && point) {
        setHover({ wardId, properties, point });
      } else {
        setHover(null);
      }
    },
    [],
  );

  const handleVisibleWardsChange = useCallback((wardIds: string[]) => {
    setVisibleWardIds(wardIds);
  }, []);

  const hoveredClassification: TrendClassificationEntry | null =
    hover && classData?.classifications?.[hover.wardId]
      ? classData.classifications[hover.wardId]
      : null;

  const isLoading = classLoading;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <span className="text-sm font-medium">Presidential Election Trends</span>
        {isLoading && (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
        {mapData && !isLoading && (
          <span className="text-xs text-muted-foreground">
            {mapData.wardCount.toLocaleString()} wards classified
          </span>
        )}
      </div>

      <TrendInfoBanner />

      {classError && (
        <div className="flex flex-1 items-center justify-center">
          <QueryErrorState error={classErrorObj!} onRetry={() => classRefetch()} />
        </div>
      )}

      {!classError && <div className="relative flex-1">
        <WisconsinMap
          mapData={mapData}
          selectedWardId={null}
          onWardClick={handleWardClick}
          onWardHover={handleWardHover}
          onVisibleWardsChange={handleVisibleWardsChange}
        />

        <TrendLegend
          demCount={viewportStats.demCount}
          repCount={viewportStats.repCount}
          incCount={viewportStats.incCount}
          minYear={viewportStats.minYear}
          maxYear={viewportStats.maxYear}
        />

        <TrendSummaryDashboard stats={viewportStats} />

        <TrendHoverTooltip
          point={hover?.point ?? null}
          properties={hover?.properties ?? null}
          classification={hoveredClassification}
        />
      </div>}
    </div>
  );
});
