import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

export interface VintageInfo {
  vintage: number;
  label: string;
  description: string;
  wardCount: number | null;
}

export const WARD_VINTAGES: VintageInfo[] = [
  {
    vintage: 2011,
    label: '2011 Wards',
    description: 'Post-2010 Census boundaries used for 2012–2016 elections',
    wardCount: null,
  },
  {
    vintage: 2017,
    label: '2017 Wards',
    description: 'Municipal boundary changes effective 2017–2019',
    wardCount: null,
  },
  {
    vintage: 2020,
    label: '2020 Wards',
    description: 'Canonical boundaries used for 2020 election data',
    wardCount: null,
  },
  {
    vintage: 2022,
    label: '2022 Wards',
    description: 'Post-2020 Census redistricting, current boundaries',
    wardCount: null,
  },
];

interface BoundaryStatsResponse {
  vintage: number;
  ward_count: number;
  county_count: number;
  municipality_count: number;
}

async function fetchBoundaryStats(vintage: number): Promise<BoundaryStatsResponse> {
  const res = await fetch(`/api/v1/wards/boundaries/stats?vintage=${vintage}`);
  if (!res.ok) {
    // Graceful fallback if endpoint doesn't exist
    return { vintage, ward_count: 0, county_count: 0, municipality_count: 0 };
  }
  return res.json();
}

export function useVintageBoundaryStats(vintage: number) {
  return useQuery({
    queryKey: [...queryKeys.wards.all, 'boundary-stats', vintage],
    queryFn: () => fetchBoundaryStats(vintage),
    staleTime: Infinity,
    retry: 1,
  });
}

export function useVintageBoundaries(vintage: number | null) {
  return useQuery<GeoJSON.FeatureCollection>({
    queryKey: [...queryKeys.wards.all, 'boundaries', vintage ?? 2020],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vintage) params.set('vintage', String(vintage));
      const res = await fetch(`/api/v1/wards/boundaries?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch boundaries: ${res.status}`);
      return res.json();
    },
    enabled: vintage !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
