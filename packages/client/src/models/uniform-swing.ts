import type { ElectionModel } from './types';
import type { WardData, Prediction } from '@/types/election';

export const uniformSwingModel: ElectionModel = {
  id: 'uniform-swing',
  name: 'Uniform Swing',
  description:
    'Applies a constant vote share adjustment to every ward based on the previous election.',
  version: '1.0.0',
  parameters: [
    {
      id: 'baseElectionYear',
      label: 'Base Election',
      type: 'select',
      defaultValue: '2024',
      options: [], // Populated dynamically from available elections
      description: 'The election to use as the baseline for projections',
    },
    {
      id: 'baseRaceType',
      label: 'Base Race',
      type: 'select',
      defaultValue: 'president',
      options: [
        { label: 'President', value: 'president' },
        { label: 'Governor', value: 'governor' },
        { label: 'US Senate', value: 'us_senate' },
        { label: 'State Senate', value: 'state_senate' },
        { label: 'State Assembly', value: 'state_assembly' },
      ],
    },
    {
      id: 'swingPoints',
      label: 'Statewide Swing (D+)',
      type: 'slider',
      min: -15,
      max: 15,
      step: 0.1,
      defaultValue: 0,
      description: 'Positive = more Democratic, Negative = more Republican',
    },
    {
      id: 'turnoutChange',
      label: 'Turnout Change (%)',
      type: 'slider',
      min: -30,
      max: 30,
      step: 1,
      defaultValue: 0,
      description: 'Uniform percentage change in turnout across all wards',
    },
  ],

  predict(wardData: WardData[], params: Record<string, unknown>): Prediction[] {
    const baseElectionYear = params.baseElectionYear as string;
    const baseRaceType = params.baseRaceType as string;
    const swingPoints = params.swingPoints as number;
    const turnoutChange = params.turnoutChange as number;

    return wardData.map((ward) => {
      const baseElection = ward.elections.find(
        (e) => e.year === Number(baseElectionYear) && e.raceType === baseRaceType,
      );

      if (!baseElection) {
        const fallback = ward.elections
          .filter((e) => e.raceType === baseRaceType)
          .sort((a, b) => b.year - a.year)[0];

        if (!fallback) {
          return {
            wardId: ward.wardId,
            predictedDemPct: 50,
            predictedRepPct: 50,
            predictedMargin: 0,
            predictedDemVotes: 0,
            predictedRepVotes: 0,
            predictedTotalVotes: 0,
            confidence: 0,
          };
        }
      }

      const election = baseElection!;
      const swing = swingPoints / 100;
      const turnoutMultiplier = 1 + turnoutChange / 100;

      const baseDemTwoParty =
        election.demVotes / (election.demVotes + election.repVotes);
      const adjustedDemTwoParty = Math.max(
        0.01,
        Math.min(0.99, baseDemTwoParty + swing),
      );

      const projectedTotal = Math.round(election.totalVotes * turnoutMultiplier);
      const twoPartyTotal = Math.round(
        (election.demVotes + election.repVotes) * turnoutMultiplier,
      );

      const projectedDem = Math.round(twoPartyTotal * adjustedDemTwoParty);
      const projectedRep = twoPartyTotal - projectedDem;

      return {
        wardId: ward.wardId,
        predictedDemPct: (projectedDem / projectedTotal) * 100,
        predictedRepPct: (projectedRep / projectedTotal) * 100,
        predictedMargin:
          ((projectedDem - projectedRep) / projectedTotal) * 100,
        predictedDemVotes: projectedDem,
        predictedRepVotes: projectedRep,
        predictedTotalVotes: projectedTotal,
        confidence: 0.7,
      };
    });
  },
};
