import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import type { RaceType } from '@/types/election';

export interface WardMapEntry {
  demPct: number;
  repPct: number;
  margin: number;
  totalVotes: number;
  demVotes: number;
  repVotes: number;
  isEstimate: boolean;
}

export interface MapDataResponse {
  year: number;
  raceType: string;
  wardCount: number;
  data: Record<string, WardMapEntry>;
}

export function useMapData(year: number | null, raceType: RaceType | null) {
  return useQuery<MapDataResponse>({
    queryKey: queryKeys.elections.mapData(year ?? 0, raceType ?? 'president'),
    queryFn: async () => {
      const res = await fetch(`/api/v1/elections/map-data/${year}/${raceType}`);
      if (!res.ok) throw new Error(`Failed to fetch map data: ${res.status}`);
      return res.json();
    },
    enabled: !!year && !!raceType,
    staleTime: 5 * 60 * 1000,
  });
}
