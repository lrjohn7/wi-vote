import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

interface WardBoundariesResponse {
  type: 'FeatureCollection';
  features: GeoJSON.Feature[];
}

export function useWardBoundaries(vintage?: number) {
  return useQuery<WardBoundariesResponse>({
    queryKey: [...queryKeys.wards.all, 'boundaries', vintage ?? 2020],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vintage) params.set('vintage', String(vintage));
      const res = await fetch(`/api/v1/wards/boundaries?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch boundaries: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity, // Boundaries don't change during a session
    gcTime: Infinity,
  });
}
