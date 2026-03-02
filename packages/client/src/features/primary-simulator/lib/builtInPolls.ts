/**
 * Built-in polls shipped with the application.
 *
 * These are real polls with full metadata. Users can disable them in the
 * averaging calculation but cannot delete them. They reappear on reset.
 */

import type { PrimaryPoll } from '@/types/primary';

export const BUILT_IN_POLLS: PrimaryPoll[] = [
  {
    id: 'marquette-2026-02',
    pollster: 'Marquette Law School',
    startDate: '2026-02-11',
    endDate: '2026-02-19',
    sampleSize: 801,
    population: 'rv',
    methodology: 'Live phone + online panel',
    pollsterRating: 2.8,
    isPartisan: false,
    marginOfError: 4.4,
    sourceUrl: 'https://law.marquette.edu/poll/',
    notes: 'First public poll of the 2026 DEM gubernatorial primary.',
    candidates: {
      hong: 11,
      barnes: 10,
      rodriguez: 6,
      crowley: 5,
      roys: 4,
      hughes: 3,
      brennan: 3,
      mcguire: 2,
    },
    undecided: 56,
    isEnabled: true,
    isBuiltIn: true,
  },
  // Additional polls will be added here as they become available
];
