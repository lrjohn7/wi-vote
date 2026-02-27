import type { ElectionModel } from './types';
import type { WardData, Prediction } from '@/types/election';

export const demographicSwingModel: ElectionModel = {
  id: 'demographic-swing',
  name: 'Demographic Swing',
  description:
    'Applies differential swing by urban/suburban/rural classification. Each ward gets its effective swing based on its classification.',
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
      id: 'urbanSwing',
      label: 'Urban Swing (D+)',
      type: 'slider',
      min: -10,
      max: 10,
      step: 0.1,
      defaultValue: 0,
      description: 'Swing applied to urban wards (>3,000 people/sq mi)',
      group: 'demographic',
    },
    {
      id: 'suburbanSwing',
      label: 'Suburban Swing (D+)',
      type: 'slider',
      min: -10,
      max: 10,
      step: 0.1,
      defaultValue: 0,
      description: 'Swing applied to suburban wards (500-3,000 people/sq mi)',
      group: 'demographic',
    },
    {
      id: 'ruralSwing',
      label: 'Rural Swing (D+)',
      type: 'slider',
      min: -10,
      max: 10,
      step: 0.1,
      defaultValue: 0,
      description: 'Swing applied to rural wards (<500 people/sq mi)',
      group: 'demographic',
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
    const urbanSwing = (params.urbanSwing as number) ?? 0;
    const suburbanSwing = (params.suburbanSwing as number) ?? 0;
    const ruralSwing = (params.ruralSwing as number) ?? 0;
    const turnoutChange = (params.turnoutChange as number) ?? 0;
    const wardClassifications = params.wardClassifications as Record<string, string> | undefined;

    const turnoutMultiplier = 1 + turnoutChange / 100;
    const year = Number(baseElectionYear);

    return wardData.map((ward) => {
      let election = ward.elections.find(
        (e) => e.year === year && e.raceType === baseRaceType,
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

      // Determine classification and effective swing
      const classification = wardClassifications?.[ward.wardId] ?? 'rural';
      let swingPoints: number;
      switch (classification) {
        case 'urban':
          swingPoints = urbanSwing;
          break;
        case 'suburban':
          swingPoints = suburbanSwing;
          break;
        default:
          swingPoints = ruralSwing;
          break;
      }

      const swing = swingPoints / 100;
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

      const baseDemTwoParty = election.demVotes / twoPartyBase;
      const adjustedDemTwoParty = Math.max(0.01, Math.min(0.99, baseDemTwoParty + swing));

      const projectedTotal = Math.round(election.totalVotes * turnoutMultiplier);
      const twoPartyTotal = Math.round(twoPartyBase * turnoutMultiplier);

      const projectedDem = Math.round(twoPartyTotal * adjustedDemTwoParty);
      const projectedRep = twoPartyTotal - projectedDem;

      return {
        wardId: ward.wardId,
        predictedDemPct: projectedTotal > 0 ? (projectedDem / projectedTotal) * 100 : 50,
        predictedRepPct: projectedTotal > 0 ? (projectedRep / projectedTotal) * 100 : 50,
        predictedMargin:
          projectedTotal > 0 ? ((projectedDem - projectedRep) / projectedTotal) * 100 : 0,
        predictedDemVotes: projectedDem,
        predictedRepVotes: projectedRep,
        predictedTotalVotes: projectedTotal,
        confidence: 0.5, // Lower than uniform since depends on classification accuracy
      };
    });
  },
};
