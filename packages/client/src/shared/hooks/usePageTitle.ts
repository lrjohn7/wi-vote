import { useEffect } from 'react';

const BASE_TITLE = 'WI-Vote';

export function usePageTitle(subtitle?: string) {
  useEffect(() => {
    document.title = subtitle ? `${subtitle} — ${BASE_TITLE}` : `${BASE_TITLE} — Wisconsin Election Explorer`;
  }, [subtitle]);
}
