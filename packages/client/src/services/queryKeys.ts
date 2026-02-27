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
  },
};
