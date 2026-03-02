import { useQuery } from '@tanstack/react-query';

export interface SimilarWard {
  ward_id: string;
  ward_name: string;
  municipality: string;
  county: string;
  similarity_score: number;
  college_pct: number;
  median_income: number;
  population_density: number;
  partisan_lean: number;
}

interface SimilarWardsResponse {
  ward_id: string;
  similar_wards: SimilarWard[];
  count: number;
}

export function useSimilarWards(wardId: string | null) {
  return useQuery<SimilarWardsResponse>({
    queryKey: ['wards', 'similar', wardId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/wards/${wardId}/similar`);
      if (!res.ok) throw new Error('Failed to fetch similar wards');
      return res.json();
    },
    enabled: !!wardId,
    staleTime: 600_000, // 10 minutes
  });
}
