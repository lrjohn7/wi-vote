import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import type { RaceType } from '@/types/election';

export interface ElectionInfo {
  year: number;
  race_type: RaceType;
  ward_count: number;
}

interface ElectionsResponse {
  elections: ElectionInfo[];
}

export function useElections() {
  return useQuery<ElectionsResponse>({
    queryKey: queryKeys.elections.all,
    queryFn: async () => {
      const res = await fetch('/api/v1/elections');
      if (!res.ok) throw new Error(`Failed to fetch elections: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
