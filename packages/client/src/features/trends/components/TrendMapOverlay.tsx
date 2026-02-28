import { useMemo, useState, useCallback } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { useTrendClassifications } from '../hooks/useTrends';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MapDataResponse, WardMapEntry } from '@/features/election-map/hooks/useMapData';
import type { TrendClassificationEntry } from '@/services/api';
import { TrendInfoBanner } from './TrendInfoBanner';
import { TrendLegend } from './TrendLegend';
import { TrendHoverTooltip } from './TrendHoverTooltip';
import { TrendSummaryDashboard } from './TrendSummaryDashboard';

const RACE_OPTIONS = [
  { label: 'President', value: 'president' },
  { label: 'Governor', value: 'governor' },
  { label: 'US Senate', value: 'us_senate' },
];

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

export function TrendMapOverlay() {
  const [raceType, setRaceType] = useState('president');
  const [hover, setHover] = useState<HoverState | null>(null);
  const { data: classData, isLoading: classLoading } = useTrendClassifications(raceType);

  const mapData = useMemo(() => {
    if (!classData?.classifications) return undefined;
    return trendToMapData(classData.classifications);
  }, [classData]);

  const summaryStats = useMemo<SummaryStats>(() => {
    if (!classData?.classifications) {
      return { demCount: 0, repCount: 0, incCount: 0, avgDemSlope: null, avgRepSlope: null, minYear: null, maxYear: null };
    }
    return computeSummary(classData.classifications);
  }, [classData]);

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

  const hoveredClassification: TrendClassificationEntry | null =
    hover && classData?.classifications?.[hover.wardId]
      ? classData.classifications[hover.wardId]
      : null;

  const isLoading = classLoading;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <span className="text-sm font-medium">Race:</span>
        <Select value={raceType} onValueChange={setRaceType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RACE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="relative flex-1">
        <WisconsinMap
          mapData={mapData}
          selectedWardId={null}
          onWardClick={handleWardClick}
          onWardHover={handleWardHover}
        />

        <TrendLegend
          demCount={summaryStats.demCount}
          repCount={summaryStats.repCount}
          incCount={summaryStats.incCount}
          minYear={summaryStats.minYear}
          maxYear={summaryStats.maxYear}
        />

        <TrendSummaryDashboard stats={summaryStats} />

        <TrendHoverTooltip
          point={hover?.point ?? null}
          properties={hover?.properties ?? null}
          classification={hoveredClassification}
        />
      </div>
    </div>
  );
}
