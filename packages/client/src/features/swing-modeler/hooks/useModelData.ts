import { useMemo } from 'react';
import { useMapData } from '@/features/election-map/hooks/useMapData';
import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';
import type { RaceType, WardData } from '@/types/election';

function mapDataToWardData(
  mapData: MapDataResponse,
): WardData[] {
  const year = mapData.year;
  const raceType = mapData.raceType as RaceType;

  return Object.entries(mapData.data).map(([wardId, entry]) => ({
    wardId,
    wardName: '',
    municipality: '',
    county: '',
    congressionalDistrict: '',
    stateSenateDistrict: '',
    assemblyDistrict: '',
    elections: [
      {
        year,
        raceType,
        demVotes: entry.demVotes,
        repVotes: entry.repVotes,
        otherVotes: entry.totalVotes - entry.demVotes - entry.repVotes,
        totalVotes: entry.totalVotes,
        demPct: entry.demPct,
        repPct: entry.repPct,
        margin: entry.margin,
        isEstimate: entry.isEstimate,
      },
    ],
  }));
}

export function useModelData(year: number | null, raceType: RaceType | null) {
  const { data: mapData, isLoading } = useMapData(year, raceType);

  const wardData = useMemo(() => {
    if (!mapData) return null;
    return mapDataToWardData(mapData);
  }, [mapData]);

  return {
    wardData,
    baseMapData: mapData ?? null,
    isLoading,
  };
}
