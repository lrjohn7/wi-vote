import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import { api, type ReportCardResponse } from '@/services/api';

export function useReportCard(wardId: string | null) {
  return useQuery<ReportCardResponse>({
    queryKey: queryKeys.wards.reportCard(wardId ?? ''),
    queryFn: () => api.getWardReportCard(wardId!),
    enabled: !!wardId,
    staleTime: 10 * 60 * 1000, // 10 minutes — data is stable
  });
}
