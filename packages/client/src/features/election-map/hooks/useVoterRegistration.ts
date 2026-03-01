import { useQuery } from '@tanstack/react-query';

export interface WardRegistration {
  ward_id: string;
  snapshot_date: string;
  total_registered: number;
  active_registered: number;
  inactive_registered: number;
  registration_rate: number | null;
}

interface RegistrationMapResponse {
  snapshot_date: string;
  ward_count: number;
  data: Record<string, WardRegistration>;
}

export function useVoterRegistrationMap(enabled: boolean) {
  return useQuery<RegistrationMapResponse>({
    queryKey: ['voter-registration', 'map-data'],
    queryFn: async () => {
      const res = await fetch('/api/v1/voter-registration/map-data');
      if (!res.ok) return { snapshot_date: '', ward_count: 0, data: {} };
      return res.json();
    },
    enabled,
    staleTime: 300000, // 5 minutes
  });
}

export function useWardRegistration(wardId: string | null) {
  return useQuery<WardRegistration[]>({
    queryKey: ['voter-registration', 'ward', wardId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/voter-registration/ward/${wardId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wardId,
  });
}
