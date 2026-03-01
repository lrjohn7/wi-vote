import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { trackPageView } from '@/shared/lib/analytics';

/**
 * Tracks page views on SPA route changes.
 * Call this once in the root App component.
 */
export function useAnalytics() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Skip the initial pageview — initAnalytics() handles that
    trackPageView();
  }, [pathname]);
}
