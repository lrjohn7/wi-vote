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

const RACE_OPTIONS = [
  { label: 'President', value: 'president' },
  { label: 'Governor', value: 'governor' },
  { label: 'US Senate', value: 'us_senate' },
];

/**
 * Map trend directions to a demPct scale for coloring:
 * - more_democratic: high demPct (blue)
 * - more_republican: low demPct (red)
 * - inconclusive: 50 (gray)
 * The slope magnitude controls intensity.
 */
function trendToMapData(
  classifications: Record<string, { direction: string; slope: number | null }>,
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

export function TrendMapOverlay() {
  const [raceType, setRaceType] = useState('president');
  const { data: classData, isLoading: classLoading } = useTrendClassifications(raceType);

  const mapData = useMemo(() => {
    if (!classData?.classifications) return undefined;
    return trendToMapData(classData.classifications);
  }, [classData]);

  const handleWardClick = useCallback(() => {
    // No-op for trend map; could add detail panel in future
  }, []);

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
      <div className="relative flex-1">
        <WisconsinMap
          mapData={mapData}
          selectedWardId={null}
          onWardClick={handleWardClick}
          onWardHover={() => {}}
        />

        {/* Custom legend */}
        <div className="absolute bottom-6 left-4 z-10 rounded-lg bg-white/90 p-3 shadow-md">
          <p className="mb-1.5 text-xs font-medium">Trend Direction</p>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-5 rounded" style={{ backgroundColor: '#2166ac' }} />
              <span>Trending Democratic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-5 rounded" style={{ backgroundColor: '#d4d4d4' }} />
              <span>Inconclusive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-5 rounded" style={{ backgroundColor: '#b2182b' }} />
              <span>Trending Republican</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
