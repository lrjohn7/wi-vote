import { useQuery } from '@tanstack/react-query';

interface DayData {
  date: string;
  sessions: number;
  pageviews: number;
}

interface PageData {
  path: string;
  views: number;
  sessions: number;
}

interface DeviceBreakdown {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface DashboardData {
  visitors_by_day: DayData[];
  top_pages: PageData[];
  avg_session_seconds: number;
  device_breakdown: DeviceBreakdown;
  totals: { pageviews: number; sessions: number };
}

export function useAnalyticsDashboard(key: string, days = 30) {
  return useQuery<DashboardData>({
    queryKey: ['analytics', 'dashboard', days],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/analytics/dashboard?key=${encodeURIComponent(key)}&days=${days}`,
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!key,
    staleTime: 60_000,
    retry: false,
  });
}
