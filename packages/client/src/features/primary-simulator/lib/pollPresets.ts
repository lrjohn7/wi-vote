import type { PollPreset } from '@/types/primary';

/**
 * Hypothetical scenario presets for the primary simulator.
 *
 * These are "what-if" scenarios, not real polls. They set each candidate's
 * pollingBaseline to a hypothetical percentage to model different outcomes.
 *
 * Real poll data is stored separately in builtInPolls.ts and managed through
 * the multi-poll averaging system.
 */
export const SCENARIO_PRESETS: PollPreset[] = [
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

/** Backward-compatible alias. */
export const POLL_PRESETS = SCENARIO_PRESETS;

/**
 * Look up a scenario preset by its unique ID.
 */
export function getPreset(id: string): PollPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id);
}
