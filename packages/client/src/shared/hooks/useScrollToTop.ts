import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls the main content area to the top on route changes.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
}
