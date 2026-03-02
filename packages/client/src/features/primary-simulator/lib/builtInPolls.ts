/**
 * Built-in polls shipped with the application.
 *
 * These are real polls with full metadata. Users can disable them in the
 * averaging calculation but cannot delete them. They reappear on reset.
 */

import type { PrimaryPoll } from '@/types/primary';

export const BUILT_IN_POLLS: PrimaryPoll[] = [
  {
    id: 'tipp-2026-02',
    pollster: 'TIPP Insights',
    startDate: '2026-02-06',
    endDate: '2026-02-12',
    sampleSize: 646,
    population: 'rv',
    methodology: 'Online panel',
    pollsterRating: 2.2,
    isPartisan: false,
    marginOfError: null,
    sourceUrl:
      'https://tippinsights.com/league-of-american-workers-survey-wisconsin-2/',
    notes:
      'League of American Workers Survey — Wisconsin. McGuire not tested.',
    candidates: {
      barnes: 28,
      rodriguez: 20,
      crowley: 7,
      hong: 5,
      roys: 2,
      hughes: 1,
      brennan: 0,
    },
    undecided: 36,
    isEnabled: true,
    isBuiltIn: true,
  },
  {
    id: 'marquette-2026-02',
    pollster: 'Marquette Law School',
    startDate: '2026-02-11',
    endDate: '2026-02-19',
    sampleSize: 394,
    population: 'rv',
    methodology: 'Live phone + online panel (hybrid)',
    pollsterRating: 2.8,
    isPartisan: false,
    marginOfError: 6.3,
    sourceUrl: 'https://law.marquette.edu/poll/2026/02/25/mlsp87-release/',
    notes:
      'Marquette Law School Poll #87. 394 Dem primary voter subsample from 818 total RV. McGuire not tested. Ranked #2 nationally by Silver Bulletin.',
    candidates: {
      hong: 11,
      barnes: 10,
      rodriguez: 6,
      crowley: 3,
      brennan: 2,
      hughes: 2,
      roys: 1,
    },
    undecided: 65,
    isEnabled: true,
    isBuiltIn: true,
  },
];
