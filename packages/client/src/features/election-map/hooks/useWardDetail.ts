import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

export interface WardDetailElection {
  ward_id: string;
  election_year: number;
  race_type: string;
  race_name: string | null;
  dem_candidate: string | null;
  rep_candidate: string | null;
  dem_votes: number;
  rep_votes: number;
  other_votes: number;
  total_votes: number;
  dem_pct: number;
  rep_pct: number;
  margin: number;
  is_estimate: boolean;
}

export interface WardDetail {
  ward_id: string;
  ward_name: string;
  municipality: string;
  municipality_type: string | null;
  county: string;
  congressional_district: string | null;
  state_senate_district: string | null;
  assembly_district: string | null;
  ward_vintage: number;
  area_sq_miles: number | null;
  is_estimated: boolean;
  elections: WardDetailElection[];
}

export function useWardDetail(wardId: string | null) {
  return useQuery<WardDetail>({
    queryKey: queryKeys.wards.detail(wardId ?? ''),
    queryFn: async () => {
      const res = await fetch(`/api/v1/wards/${wardId}`);
      if (!res.ok) throw new Error(`Failed to fetch ward: ${res.status}`);
      return res.json();
    },
    enabled: !!wardId,
    staleTime: 5 * 60 * 1000,
  });
}
