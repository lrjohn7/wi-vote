import type { RaceType } from '@/types/election';

export const queryKeys = {
  wards: {
    all: ['wards'] as const,
    boundaries: (vintage: number) => ['wards', 'boundaries', vintage] as const,
    detail: (wardId: string) => ['wards', wardId] as const,
    geocode: (lat: number, lng: number) => ['wards', 'geocode', lat, lng] as const,
    search: (query: string) => ['wards', 'search', query] as const,
    reportCard: (wardId: string) => ['wards', wardId, 'report-card'] as const,
  },
  elections: {
    all: ['elections'] as const,
    results: (year: number, race: RaceType) =>
      ['elections', year, race] as const,
    mapData: (year: number, race: RaceType) =>
      ['elections', 'map', year, race] as const,
  },
  trends: {
    ward: (wardId: string) => ['trends', wardId] as const,
    area: (filters: Record<string, string>) =>
      ['trends', 'area', filters] as const,
    classify: (raceType: string) =>
      ['trends', 'classify', raceType] as const,
  },
  scenarios: {
    all: ['scenarios'] as const,
    detail: (shortId: string) => ['scenarios', shortId] as const,
    list: (limit: number) => ['scenarios', 'list', limit] as const,
  },
  aggregations: {
    county: (county: string, year: number, raceType: string) =>
      ['aggregations', 'county', county, year, raceType] as const,
    district: (districtType: string, districtId: string, year: number, raceType: string) =>
      ['aggregations', 'district', districtType, districtId, year, raceType] as const,
    statewide: (year: number, raceType: string) =>
      ['aggregations', 'statewide', year, raceType] as const,
  },
};
