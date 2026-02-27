import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import type {
  WardTrendResponse,
  AreaTrendsResponse,
  TrendClassificationsResponse,
} from '@/services/api';

export function useWardTrend(wardId: string | null) {
  return useQuery<WardTrendResponse>({
    queryKey: queryKeys.trends.ward(wardId ?? ''),
    queryFn: () => api.getWardTrend(wardId!),
    enabled: !!wardId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreaTrends(filters: Record<string, string>) {
  const hasFilters = Object.values(filters).some((v) => v !== '');

  return useQuery<AreaTrendsResponse>({
    queryKey: queryKeys.trends.area(filters),
    queryFn: () => api.getAreaTrends(filters),
    enabled: hasFilters,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrendClassifications(raceType: string) {
  return useQuery<TrendClassificationsResponse>({
    queryKey: queryKeys.trends.classify(raceType),
    queryFn: () => api.getTrendClassifications(raceType),
    staleTime: 10 * 60 * 1000,
  });
}
