import { useQuery } from '@tanstack/react-query';

export interface SpringContest {
  year: number;
  election_date: string | null;
  contest_name: string;
  candidate_1_name: string;
  candidate_2_name: string;
  reporting_unit_count: number;
  candidate_1_total: number;
  candidate_2_total: number;
  total_votes: number;
}

interface ContestsResponse {
  contests: SpringContest[];
}

export function useSpringContests() {
  return useQuery<ContestsResponse>({
    queryKey: ['spring-elections'],
    queryFn: async () => {
      const res = await fetch('/api/v1/spring-elections');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface SpringResult {
  id: number;
  county: string;
  reporting_unit: string;
  election_year: number;
  contest_name: string;
  candidate_1_name: string;
  candidate_1_votes: number;
  candidate_1_pct: number;
  candidate_2_name: string;
  candidate_2_votes: number;
  candidate_2_pct: number;
  scattering_votes: number;
  total_votes: number;
  margin: number;
}

interface ResultsResponse {
  results: SpringResult[];
  total: number;
  page: number;
  page_size: number;
}

export function useSpringResults(
  year: number | null,
  county?: string,
  search?: string,
  page: number = 1,
  pageSize: number = 50,
) {
  return useQuery<ResultsResponse>({
    queryKey: ['spring-elections', year, county, search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (county) params.set('county', county);
      if (search) params.set('search', search);
      const res = await fetch(`/api/v1/spring-elections/${year}?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
    enabled: !!year,
    staleTime: 5 * 60 * 1000,
  });
}

export interface CountySummary {
  county: string;
  candidate_1_name: string;
  candidate_1_votes: number;
  candidate_2_name: string;
  candidate_2_votes: number;
  total_votes: number;
  margin: number;
  reporting_units: number;
}

interface CountyResponse {
  counties: CountySummary[];
  year: number;
}

export function useSpringCountySummary(year: number | null) {
  return useQuery<CountyResponse>({
    queryKey: ['spring-elections', year, 'counties'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spring-elections/${year}/counties`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
    enabled: !!year,
    staleTime: 5 * 60 * 1000,
  });
}
