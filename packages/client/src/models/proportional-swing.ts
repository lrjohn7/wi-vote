import type { ElectionModel } from './types';
import type { WardData, Prediction } from '@/types/election';

export const proportionalSwingModel: ElectionModel = {
  id: 'proportional-swing',
  name: 'Proportional Swing',
  description:
    'Applies a multiplicative vote share adjustment. Wards with higher base support shift more in absolute terms.',
  version: '1.0.0',
  parameters: [
    {
      id: 'baseElectionYear',
      label: 'Base Election',
      type: 'select',
      defaultValue: '2024',
      options: [],
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
      let election = ward.elections.find(
        (e) => e.year === Number(baseElectionYear) && e.raceType === baseRaceType,
      );

      if (!election) {
        election = ward.elections
          .filter((e) => e.raceType === baseRaceType)
          .sort((a, b) => b.year - a.year)[0];
      }

      if (!election) {
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

      const twoPartyBase = election.demVotes + election.repVotes;
      if (twoPartyBase === 0) {
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

      const swingFactor = swingPoints / 100;
      const turnoutMultiplier = 1 + turnoutChange / 100;

      // Multiplicative: adjustedDem = baseDem * (1 + swing)
      const baseDemTwoParty = election.demVotes / twoPartyBase;
      const rawAdjusted = baseDemTwoParty * (1 + swingFactor);
      const adjustedDemTwoParty = Math.max(0.01, Math.min(0.99, rawAdjusted));

      const projectedTotal = Math.round(election.totalVotes * turnoutMultiplier);
      const twoPartyTotal = Math.round(twoPartyBase * turnoutMultiplier);

      const projectedDem = Math.round(twoPartyTotal * adjustedDemTwoParty);
      const projectedRep = twoPartyTotal - projectedDem;

      return {
        wardId: ward.wardId,
        predictedDemPct: projectedTotal > 0 ? (projectedDem / projectedTotal) * 100 : 50,
        predictedRepPct: projectedTotal > 0 ? (projectedRep / projectedTotal) * 100 : 50,
        predictedMargin:
          projectedTotal > 0
            ? ((projectedDem - projectedRep) / projectedTotal) * 100
            : 0,
        predictedDemVotes: projectedDem,
        predictedRepVotes: projectedRep,
        predictedTotalVotes: projectedTotal,
        confidence: 0.6,
      };
    });
  },
};
