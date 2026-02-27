// Web Worker for swing model computation
// Duplicates predict logic since workers have separate module scope

interface ElectionResult {
  year: number;
  raceType: string;
  demVotes: number;
  repVotes: number;
  otherVotes: number;
  totalVotes: number;
  demPct: number;
  repPct: number;
  margin: number;
  isEstimate: boolean;
}

interface WardData {
  wardId: string;
  elections: ElectionResult[];
}

interface Prediction {
  wardId: string;
  predictedDemPct: number;
  predictedRepPct: number;
  predictedMargin: number;
  predictedDemVotes: number;
  predictedRepVotes: number;
  predictedTotalVotes: number;
  confidence?: number;
}

interface WorkerRequest {
  wardData: WardData[];
  params: {
    baseElectionYear: string;
    baseRaceType: string;
    swingPoints: number;
    turnoutChange: number;
  };
  modelType?: 'uniform-swing' | 'proportional-swing';
  wardRegions?: Record<string, string>;
  regionalSwing?: Record<string, number>;
}

interface WorkerResponse {
  predictions: Prediction[];
}

function getEffectiveSwing(
  wardId: string,
  baseSwing: number,
  wardRegions?: Record<string, string>,
  regionalSwing?: Record<string, number>,
): number {
  if (!wardRegions || !regionalSwing) return baseSwing;
  const region = wardRegions[wardId];
  if (!region) return baseSwing;
  const regionOffset = regionalSwing[region];
  if (regionOffset === undefined) return baseSwing;
  return baseSwing + regionOffset;
}

function findElection(
  ward: WardData,
  year: number,
  raceType: string,
): ElectionResult | undefined {
  let election = ward.elections.find(
    (e) => e.year === year && e.raceType === raceType,
  );
  if (!election) {
    election = ward.elections
      .filter((e) => e.raceType === raceType)
      .sort((a, b) => b.year - a.year)[0];
  }
  return election;
}

const NO_DATA_PREDICTION: Omit<Prediction, 'wardId'> = {
  predictedDemPct: 50,
  predictedRepPct: 50,
  predictedMargin: 0,
  predictedDemVotes: 0,
  predictedRepVotes: 0,
  predictedTotalVotes: 0,
  confidence: 0,
};

function predictUniform(
  wardData: WardData[],
  params: WorkerRequest['params'],
  wardRegions?: Record<string, string>,
  regionalSwing?: Record<string, number>,
): Prediction[] {
  const { baseElectionYear, baseRaceType, turnoutChange } = params;
  const turnoutMultiplier = 1 + turnoutChange / 100;
  const year = Number(baseElectionYear);

  return wardData.map((ward) => {
    const election = findElection(ward, year, baseRaceType);
    if (!election) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

    const twoPartyBase = election.demVotes + election.repVotes;
    if (twoPartyBase === 0) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

    const effectiveSwing = getEffectiveSwing(
      ward.wardId, params.swingPoints, wardRegions, regionalSwing,
    );
    const swing = effectiveSwing / 100;

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
      confidence: 0.7,
    };
  });
}

function predictProportional(
  wardData: WardData[],
  params: WorkerRequest['params'],
  wardRegions?: Record<string, string>,
  regionalSwing?: Record<string, number>,
): Prediction[] {
  const { baseElectionYear, baseRaceType, turnoutChange } = params;
  const turnoutMultiplier = 1 + turnoutChange / 100;
  const year = Number(baseElectionYear);

  return wardData.map((ward) => {
    const election = findElection(ward, year, baseRaceType);
    if (!election) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

    const twoPartyBase = election.demVotes + election.repVotes;
    if (twoPartyBase === 0) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

    const effectiveSwing = getEffectiveSwing(
      ward.wardId, params.swingPoints, wardRegions, regionalSwing,
    );
    const swingFactor = effectiveSwing / 100;

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
        projectedTotal > 0 ? ((projectedDem - projectedRep) / projectedTotal) * 100 : 0,
      predictedDemVotes: projectedDem,
      predictedRepVotes: projectedRep,
      predictedTotalVotes: projectedTotal,
      confidence: 0.6,
    };
  });
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { wardData, params, modelType, wardRegions, regionalSwing } = e.data;

  const predictions =
    modelType === 'proportional-swing'
      ? predictProportional(wardData, params, wardRegions, regionalSwing)
      : predictUniform(wardData, params, wardRegions, regionalSwing);

  self.postMessage({ predictions } satisfies WorkerResponse);
};
