export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  params: Record<string, unknown>;
}

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: '2020-electorate',
    label: '2020 Electorate',
    description: 'Baseline 2020 presidential election, no adjustments',
    params: {
      baseElectionYear: '2020',
      baseRaceType: 'president',
      swingPoints: 0,
      turnoutChange: 0,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
  {
    id: '2016-electorate',
    label: '2016 Electorate',
    description: 'Baseline 2016 presidential election, no adjustments',
    params: {
      baseElectionYear: '2016',
      baseRaceType: 'president',
      swingPoints: 0,
      turnoutChange: 0,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
  {
    id: 'high-turnout',
    label: 'High Turnout',
    description: '2024 baseline with +15% turnout increase',
    params: {
      baseElectionYear: '2024',
      baseRaceType: 'president',
      swingPoints: 0,
      turnoutChange: 15,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
  {
    id: 'low-turnout',
    label: 'Low Turnout',
    description: '2024 baseline with -15% turnout decrease',
    params: {
      baseElectionYear: '2024',
      baseRaceType: 'president',
      swingPoints: 0,
      turnoutChange: -15,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
  {
    id: 'd-wave-5',
    label: 'D Wave +5',
    description: '2024 baseline with D+5 statewide swing',
    params: {
      baseElectionYear: '2024',
      baseRaceType: 'president',
      swingPoints: 5,
      turnoutChange: 0,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
  {
    id: 'r-wave-5',
    label: 'R Wave +5',
    description: '2024 baseline with R+5 statewide swing',
    params: {
      baseElectionYear: '2024',
      baseRaceType: 'president',
      swingPoints: -5,
      turnoutChange: 0,
      swing_milwaukee_metro: 0,
      swing_madison_metro: 0,
      swing_fox_valley: 0,
      swing_rural: 0,
    },
  },
];
