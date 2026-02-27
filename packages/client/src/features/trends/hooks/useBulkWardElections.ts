import { useQuery } from '@tanstack/react-query';
import { api, type TrendElection } from '@/services/api';

/**
 * Fetches election histories for a batch of ward IDs.
 * Returns Record<wardId, TrendElection[]>.
 */
export function useBulkWardElections(wardIds: string[]) {
  return useQuery({
    queryKey: ['trends', 'bulk-elections', wardIds.slice(0, 10).join(','), wardIds.length],
    queryFn: async () => {
      if (wardIds.length === 0) return {};
      const response = await api.getBulkWardElections(wardIds);
      return response.elections;
    },
    enabled: wardIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
