import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

interface WardSearchResult {
  ward_id: string;
  ward_name: string;
  municipality: string;
  county: string;
  congressional_district: string | null;
  state_senate_district: string | null;
  assembly_district: string | null;
  ward_vintage: number;
}

interface SearchResponse {
  results: WardSearchResult[];
  query: string;
  count: number;
}

export function useWardSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: queryKeys.wards.search(query),
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/wards/search?q=${encodeURIComponent(query)}&limit=50`,
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      return res.json();
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}
