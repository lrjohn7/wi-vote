import { useMemo } from 'react';
import { useMapData } from '@/features/election-map/hooks/useMapData';
import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';
import type { RaceType, WardData, DemographicData } from '@/types/election';
import type { FeatureCollection, Geometry } from 'geojson';
import { extractWardMetadata } from '@/shared/lib/wardMetadata';
import { useBulkDemographics } from '@/shared/hooks/useWardDemographics';

function mapDataToWardData(
  mapData: MapDataResponse,
  wardMeta: Record<string, { county: string; municipality: string; congressionalDistrict: string; stateSenateDistrict: string; assemblyDistrict: string }>,
  demographics?: Record<string, DemographicData> | null,
): WardData[] {
  const year = mapData.year;
  const raceType = mapData.raceType as RaceType;

  return Object.entries(mapData.data).map(([wardId, entry]) => {
    const meta = wardMeta[wardId];
    return {
      wardId,
      wardName: '',
      municipality: meta?.municipality ?? '',
      county: meta?.county ?? '',
      congressionalDistrict: meta?.congressionalDistrict ?? '',
      stateSenateDistrict: meta?.stateSenateDistrict ?? '',
      assemblyDistrict: meta?.assemblyDistrict ?? '',
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
      demographics: demographics?.[wardId],
    };
  });
}

export function useModelData(
  year: number | null,
  raceType: RaceType | null,
  boundaries?: FeatureCollection<Geometry>,
) {
  const { data: mapData, isLoading } = useMapData(year, raceType);
  const { data: bulkDemographics } = useBulkDemographics();

  const wardMeta = useMemo(() => extractWardMetadata(boundaries), [boundaries]);

  const wardData = useMemo(() => {
    if (!mapData) return null;
    return mapDataToWardData(mapData, wardMeta, bulkDemographics);
  }, [mapData, wardMeta, bulkDemographics]);

  return {
    wardData,
    baseMapData: mapData ?? null,
    bulkDemographics: bulkDemographics ?? null,
    isLoading,
  };
}
