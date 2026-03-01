import { useQuery } from '@tanstack/react-query';

export interface LiveElection {
  election_date: string;
  election_name: string;
  is_active: boolean;
  total_wards: number;
  wards_reporting: number;
  pct_reporting: number;
  last_updated: string;
}

export interface LiveRaceSummary {
  race_type: string;
  total_dem_votes: number;
  total_rep_votes: number;
  total_other_votes: number;
  total_votes: number;
  wards_reporting: number;
  total_wards: number;
  pct_reporting: number;
  dem_pct: number;
  rep_pct: number;
  margin: number;
}

export interface LiveWardResult {
  ward_id: string;
  dem_votes: number;
  rep_votes: number;
  other_votes: number;
  total_votes: number;
  pct_reporting: number;
  is_final: boolean;
  last_updated: string;
}

export interface LiveResultsResponse {
  election: LiveElection;
  races: LiveRaceSummary[];
  ward_results: Record<string, LiveWardResult>;
  last_poll: string;
}

export function useLiveElections() {
  return useQuery<LiveElection[]>({
    queryKey: ['live', 'elections'],
    queryFn: async () => {
      const res = await fetch('/api/v1/live/elections');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useLiveResults(electionDate: string | null, enabled = true) {
  return useQuery<LiveResultsResponse>({
    queryKey: ['live', 'results', electionDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/live/results/${electionDate}`);
      if (!res.ok) throw new Error(`Failed to fetch live results: ${res.status}`);
      return res.json();
    },
    enabled: enabled && !!electionDate,
    refetchInterval: (query) => {
      // Poll more frequently if election is active
      const data = query.state.data;
      if (data?.election?.is_active) return 10000; // 10 seconds
      return false; // Don't poll if not active
    },
  });
}
