import type { RaceType } from '@/types/election';

export const RACE_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  us_senate: 'US Senate',
  us_house: 'US House',
  state_senate: 'State Senate',
  state_assembly: 'State Assembly',
  attorney_general: 'Attorney General',
  secretary_of_state: 'Sec. of State',
  treasurer: 'Treasurer',
};

/** Short labels for compact UIs */
export const RACE_LABELS_SHORT: Record<string, string> = {
  ...RACE_LABELS,
  attorney_general: 'AG',
  secretary_of_state: 'SoS',
};

export function formatRaceLabel(raceType: string): string {
  return RACE_LABELS[raceType] ?? raceType;
}

export function formatRaceLabelShort(raceType: string): string {
  return RACE_LABELS_SHORT[raceType] ?? raceType;
}

export function formatElectionLabel(year: number, raceType: string): string {
  return `${year} ${formatRaceLabel(raceType)}`;
}

/** Race options for select dropdowns */
export const RACE_OPTIONS: { label: string; value: RaceType }[] = [
  { label: 'President', value: 'president' },
  { label: 'Governor', value: 'governor' },
  { label: 'US Senate', value: 'us_senate' },
  { label: 'State Senate', value: 'state_senate' },
  { label: 'State Assembly', value: 'state_assembly' },
  { label: 'Attorney General', value: 'attorney_general' },
  { label: 'Sec. of State', value: 'secretary_of_state' },
  { label: 'Treasurer', value: 'treasurer' },
];
