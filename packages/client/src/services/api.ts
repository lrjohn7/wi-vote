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

export const api = {
  // Wards
  getWards: (params?: URLSearchParams) =>
    request<unknown>(`/api/v1/wards?${params?.toString() ?? ''}`),
  getWard: (wardId: string) =>
    request<unknown>(`/api/v1/wards/${wardId}`),
  geocodeWard: (lat: number, lng: number) =>
    request<unknown>(`/api/v1/wards/geocode?lat=${lat}&lng=${lng}`),
  searchWards: (query: string) =>
    request<unknown>(`/api/v1/wards/search?q=${encodeURIComponent(query)}`),

  // Elections
  getElections: () => request<unknown>('/api/v1/elections'),
  getElectionResults: (year: number, raceType: string) =>
    request<unknown>(`/api/v1/elections/${year}/${raceType}`),
  getMapData: (year: number, raceType: string) =>
    request<unknown>(`/api/v1/elections/map-data/${year}/${raceType}`),

  // Trends
  getWardTrend: (wardId: string) =>
    request<unknown>(`/api/v1/trends/ward/${wardId}`),

  // Models
  predict: (body: unknown) =>
    request<unknown>('/api/v1/models/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
