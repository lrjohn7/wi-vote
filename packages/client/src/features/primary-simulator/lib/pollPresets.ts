import type { PollPreset } from '@/types/primary';

/**
 * Poll snapshot presets for the primary simulator.
 *
 * Each preset represents either a real poll (with source and date) or a
 * hypothetical scenario. When applied, the preset sets each candidate's
 * pollingBaseline to the corresponding percentage value.
 *
 * The 'undecided' field represents the share of voters not committed to
 * any named candidate. The model allocates undecided voters based on
 * geographic, demographic, and ideological factors.
 */
export const POLL_PRESETS: PollPreset[] = [
  {
    id: 'marquette-feb-2026',
    name: 'Marquette Feb 2026',
    source: 'Marquette Law School',
    date: '2026-02-19',
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
  },
  {
    id: 'even-field',
    name: 'Even Field',
    source: 'Hypothetical',
    date: '',
    candidates: {
      barnes: 12.5,
      crowley: 12.5,
      rodriguez: 12.5,
      hong: 12.5,
      roys: 12.5,
      hughes: 12.5,
      brennan: 12.5,
      mcguire: 12.5,
    },
    undecided: 0,
  },
  {
    id: 'barnes-consolidation',
    name: 'Barnes Consolidation',
    source: 'Hypothetical',
    date: '',
    candidates: {
      barnes: 25,
      hong: 15,
      rodriguez: 12,
      crowley: 10,
      roys: 8,
      hughes: 5,
      brennan: 5,
      mcguire: 4,
    },
    undecided: 16,
  },
  {
    id: 'progressive-surge',
    name: 'Progressive Surge',
    source: 'Hypothetical',
    date: '',
    candidates: {
      hong: 22,
      barnes: 15,
      roys: 12,
      crowley: 10,
      rodriguez: 10,
      hughes: 4,
      brennan: 4,
      mcguire: 3,
    },
    undecided: 20,
  },
];

/**
 * Look up a poll preset by its unique ID.
 *
 * @param id - Preset identifier (e.g. 'marquette-feb-2026')
 * @returns The matching preset, or undefined if not found
 */
export function getPreset(id: string): PollPreset | undefined {
  return POLL_PRESETS.find((p) => p.id === id);
}
