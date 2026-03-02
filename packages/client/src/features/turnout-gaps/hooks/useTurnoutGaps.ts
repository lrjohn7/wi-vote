import { useQuery } from '@tanstack/react-query';
import type { RaceType } from '@/types/election';

export interface TurnoutGapWard {
  ward_id: string;
  ward_name: string;
  municipality: string;
  county: string;
  total_votes: number;
  county_avg_turnout: number;
  turnout_gap: number;
  party_pct: number;
  potential_votes: number;
}

export interface TurnoutGapsResponse {
  year: number;
  race_type: string;
  party: string;
  total_potential_votes: number;
  ward_count: number;
  avg_gap: number;
  wards: TurnoutGapWard[];
}

export function useTurnoutGaps(year: number | null, raceType: RaceType | null, party: 'dem' | 'rep' = 'dem') {
  return useQuery<TurnoutGapsResponse>({
    queryKey: ['elections', 'turnout-gaps', year, raceType, party],
    queryFn: async () => {
      const res = await fetch(`/api/v1/elections/turnout-gaps/${year}/${raceType}?party=${party}`);
      if (!res.ok) throw new Error('Failed to fetch turnout gaps');
      return res.json();
    },
    enabled: !!year && !!raceType,
    staleTime: 300_000,
  });
}
