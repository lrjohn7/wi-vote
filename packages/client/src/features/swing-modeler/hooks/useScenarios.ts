import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';

export function useScenarioList(limit = 10) {
  return useQuery({
    queryKey: queryKeys.scenarios.list(limit),
    queryFn: () => api.listScenarios(limit),
  });
}

export function useScenario(shortId: string | null) {
  return useQuery({
    queryKey: queryKeys.scenarios.detail(shortId ?? ''),
    queryFn: () => api.loadScenario(shortId!),
    enabled: !!shortId,
  });
}

export function useSaveScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      model_id: string;
      parameters: Record<string, unknown>;
    }) => api.saveScenario(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all });
    },
  });
}
