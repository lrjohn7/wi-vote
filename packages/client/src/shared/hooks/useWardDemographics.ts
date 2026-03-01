import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { DemographicData } from '@/types/election';

interface WardDemographicsResponse {
  ward_id: string;
  census_year: number;
  total_population: number;
  voting_age_population: number;
  white_pct: number;
  black_pct: number;
  hispanic_pct: number;
  asian_pct: number;
  college_degree_pct: number;
  median_household_income: number;
  urban_rural_class: 'urban' | 'suburban' | 'rural';
  population_density: number;
  ward_vintage: number;
}

function toDemographicData(raw: WardDemographicsResponse): DemographicData {
  return {
    totalPopulation: raw.total_population,
    votingAgePopulation: raw.voting_age_population,
    whitePct: raw.white_pct,
    blackPct: raw.black_pct,
    hispanicPct: raw.hispanic_pct,
    asianPct: raw.asian_pct,
    collegDegreePct: raw.college_degree_pct,
    medianHouseholdIncome: raw.median_household_income,
    urbanRuralClass: raw.urban_rural_class,
    populationDensity: raw.population_density,
  };
}

export function useWardDemographics(wardId: string | null) {
  return useQuery({
    queryKey: ['demographics', wardId],
    queryFn: async () => {
      const raw = await api.getWardDemographics(wardId!) as unknown as WardDemographicsResponse;
      return toDemographicData(raw);
    },
    enabled: !!wardId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // 404 means no demographics for this ward
  });
}

interface BulkDemographicsResponse {
  ward_count: number;
  demographics: Record<string, {
    total_population: number;
    voting_age_population: number;
    white_pct: number;
    black_pct: number;
    hispanic_pct: number;
    asian_pct: number;
    college_degree_pct: number;
    median_household_income: number;
    urban_rural_class: 'urban' | 'suburban' | 'rural';
    population_density: number;
  }>;
}

export function useBulkDemographics(enabled = true) {
  return useQuery({
    queryKey: ['demographics', 'bulk'],
    queryFn: async () => {
      const raw = await api.getBulkDemographics() as BulkDemographicsResponse;
      const result: Record<string, DemographicData> = {};
      for (const [wardId, d] of Object.entries(raw.demographics)) {
        result[wardId] = {
          totalPopulation: d.total_population,
          votingAgePopulation: d.voting_age_population,
          whitePct: d.white_pct,
          blackPct: d.black_pct,
          hispanicPct: d.hispanic_pct,
          asianPct: d.asian_pct,
          collegDegreePct: d.college_degree_pct,
          medianHouseholdIncome: d.median_household_income,
          urbanRuralClass: d.urban_rural_class,
          populationDensity: d.population_density,
        };
      }
      return result;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes — Census data is static
  });
}
