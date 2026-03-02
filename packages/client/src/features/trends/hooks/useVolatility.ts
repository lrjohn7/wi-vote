import { useQuery } from '@tanstack/react-query';

export interface WardVolatility {
  volatility: number;
  mean_margin: number;
  min_margin: number;
  max_margin: number;
  election_count: number;
  range: number;
  ward_name: string;
  municipality: string;
  county: string;
}

export interface VolatilityResponse {
  race_type: string;
  ward_count: number;
  data: Record<string, WardVolatility>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useVolatility(raceType: string = 'president') {
  return useQuery<VolatilityResponse>({
    queryKey: ['trends', 'volatility', raceType],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/v1/trends/volatility?race_type=${encodeURIComponent(raceType)}`,
      );
      if (!res.ok) throw new Error('Failed to fetch volatility data');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
