import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';
import type { ElectionInfo } from '@/features/election-map/hooks/useElections';
import type { WardDetail } from '@/features/election-map/hooks/useWardDetail';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Response types ──

interface WardListResponse {
  wards: WardSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface WardSummary {
  ward_id: string;
  ward_name: string;
  municipality: string;
  county: string;
  congressional_district: string | null;
  state_senate_district: string | null;
  assembly_district: string | null;
  ward_vintage: number;
}

interface SearchResponse {
  results: WardSummary[];
  query: string;
  count: number;
}

interface GeocodeResponse {
  ward: WardSummary | null;
  coordinates: { lat: number; lng: number };
}

interface ElectionsResponse {
  elections: ElectionInfo[];
}

export interface ReportCardPartisanLean {
  score: number | null;
  label: string;
  elections_used: number;
  percentile: number | null;
}

export interface ReportCardTrend {
  direction: 'more_democratic' | 'more_republican' | 'inconclusive';
  slope: number | null;
  r_squared: number | null;
  p_value: number | null;
  is_significant: boolean;
  elections_analyzed: number;
  start_year: number | null;
  end_year: number | null;
}

export interface ReportCardElection {
  election_year: number;
  race_type: string;
  race_name: string | null;
  dem_candidate: string | null;
  rep_candidate: string | null;
  dem_votes: number;
  rep_votes: number;
  other_votes: number;
  total_votes: number;
  dem_pct: number;
  rep_pct: number;
  margin: number;
  is_estimate: boolean;
}

export interface ReportCardComparison {
  election_year: number;
  race_type: string;
  ward_margin: number;
  county_margin: number | null;
  state_margin: number | null;
}

export interface ReportCardTurnout {
  election_year: number;
  race_type: string;
  total_votes: number;
}

export interface ReportCardResponse {
  metadata: {
    ward_id: string;
    ward_name: string;
    municipality: string;
    municipality_type: string | null;
    county: string;
    congressional_district: string | null;
    state_senate_district: string | null;
    assembly_district: string | null;
    ward_vintage: number;
    is_estimated: boolean;
  };
  partisan_lean: ReportCardPartisanLean;
  trend: ReportCardTrend;
  elections: ReportCardElection[];
  comparisons: ReportCardComparison[];
  turnout: ReportCardTurnout[];
  has_estimates: boolean;
}

// ── Trend types ──

export interface WardTrendInfo {
  race_type: string;
  direction: 'more_democratic' | 'more_republican' | 'inconclusive';
  slope: number | null;
  r_squared: number | null;
  p_value: number | null;
  elections_analyzed: number;
  start_year: number | null;
  end_year: number | null;
}

export interface TrendElection {
  year: number;
  race_type: string;
  dem_votes: number;
  rep_votes: number;
  other_votes: number;
  total_votes: number;
  dem_pct: number;
  rep_pct: number;
  margin: number;
  is_estimate: boolean;
}

export interface WardTrendResponse {
  ward_id: string;
  trends: WardTrendInfo[];
  elections: TrendElection[];
}

export interface AreaTrendEntry {
  ward_id: string;
  race_type: string;
  direction: string;
  slope: number | null;
  r_squared: number | null;
  p_value: number | null;
}

export interface AreaTrendsResponse {
  summary: {
    more_democratic: number;
    more_republican: number;
    inconclusive: number;
  };
  total_wards: number;
  trends: AreaTrendEntry[];
}

export interface TrendClassificationsResponse {
  race_type: string;
  classifications: Record<string, { direction: string; slope: number | null }>;
}

// ── API methods ──

export const api = {
  // Wards
  getWards: (params?: URLSearchParams) =>
    request<WardListResponse>(`/api/v1/wards?${params?.toString() ?? ''}`),
  getWard: (wardId: string) =>
    request<WardDetail>(`/api/v1/wards/${wardId}`),
  getWardBoundaries: (vintage?: number) =>
    request<GeoJSON.FeatureCollection>(
      `/api/v1/wards/boundaries${vintage ? `?vintage=${vintage}` : ''}`,
    ),
  geocodeWard: (lat: number, lng: number) =>
    request<GeocodeResponse>(`/api/v1/wards/geocode?lat=${lat}&lng=${lng}`),
  searchWards: (query: string) =>
    request<SearchResponse>(`/api/v1/wards/search?q=${encodeURIComponent(query)}`),

  // Elections
  getElections: () => request<ElectionsResponse>('/api/v1/elections'),
  getElectionResults: (year: number, raceType: string) =>
    request<{ results: unknown[]; total: number }>(
      `/api/v1/elections/${year}/${raceType}`,
    ),
  getMapData: (year: number, raceType: string) =>
    request<MapDataResponse>(`/api/v1/elections/map-data/${year}/${raceType}`),

  // Report Card
  getWardReportCard: (wardId: string, raceType: string = 'president') =>
    request<ReportCardResponse>(
      `/api/v1/wards/${wardId}/report-card?race_type=${encodeURIComponent(raceType)}`,
    ),

  // Trends
  getWardTrend: (wardId: string) =>
    request<WardTrendResponse>(`/api/v1/trends/ward/${wardId}`),
  getAreaTrends: (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    return request<AreaTrendsResponse>(`/api/v1/trends/area?${params.toString()}`);
  },
  getTrendClassifications: (raceType: string) =>
    request<TrendClassificationsResponse>(`/api/v1/trends/classify?race_type=${encodeURIComponent(raceType)}`),

  // Bulk elections
  getBulkWardElections: (wardIds: string[]) =>
    request<{ ward_count: number; elections: Record<string, TrendElection[]> }>(
      '/api/v1/trends/bulk-elections',
      {
        method: 'POST',
        body: JSON.stringify({ ward_ids: wardIds }),
      },
    ),

  // Demographics
  getWardDemographics: (wardId: string) =>
    request<Record<string, unknown>>(`/api/v1/demographics/ward/${wardId}`),
  getBulkDemographics: () =>
    request<{ ward_count: number; demographics: Record<string, Record<string, unknown>> }>(
      '/api/v1/demographics/bulk',
    ),
  getDemographicsSummary: () =>
    request<Record<string, unknown>>('/api/v1/demographics/summary'),

  // Models
  predict: (body: unknown) =>
    request<unknown>('/api/v1/models/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
