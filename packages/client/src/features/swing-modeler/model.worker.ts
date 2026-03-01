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

interface UncertaintyBand {
  wardId: string;
  lowerDemPct: number;
  upperDemPct: number;
  lowerMargin: number;
  upperMargin: number;
}

interface WorkerRequest {
  wardData: WardData[];
  params: {
    baseElectionYear: string;
    baseRaceType: string;
    swingPoints: number;
    turnoutChange: number;
    urbanSwing?: number;
    suburbanSwing?: number;
    ruralSwing?: number;
  };
  modelType?: 'uniform-swing' | 'proportional-swing' | 'demographic-swing';
  wardRegions?: Record<string, string>;
  regionalSwing?: Record<string, number>;
  wardClassifications?: Record<string, string>;
  regionalTurnout?: Record<string, number>;
  demographicTurnout?: Record<string, number>;
  computeUncertainty?: boolean;
}

interface WorkerResponse {
  predictions: Prediction[];
  uncertainty?: UncertaintyBand[];
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

function getEffectiveTurnout(
  wardId: string,
  baseTurnout: number,
  wardRegions?: Record<string, string>,
  regionalTurnout?: Record<string, number>,
  wardClassifications?: Record<string, string>,
  demographicTurnout?: Record<string, number>,
): number {
  let effective = baseTurnout;
  if (wardRegions && regionalTurnout) {
    const region = wardRegions[wardId];
    if (region) {
      const offset = regionalTurnout[region];
      if (offset !== undefined) effective += offset;
    }
  }
  if (wardClassifications && demographicTurnout) {
    const classification = wardClassifications[wardId];
    if (classification) {
      const offset = demographicTurnout[classification];
      if (offset !== undefined) effective += offset;
    }
  }
  return effective;
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
  regionalTurnout?: Record<string, number>,
  wardClassifications?: Record<string, string>,
  demographicTurnout?: Record<string, number>,
): Prediction[] {
  const { baseElectionYear, baseRaceType, turnoutChange } = params;
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

    const effectiveTurnout = getEffectiveTurnout(
      ward.wardId, turnoutChange, wardRegions, regionalTurnout,
      wardClassifications, demographicTurnout,
    );
    const turnoutMultiplier = 1 + effectiveTurnout / 100;

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
  regionalTurnout?: Record<string, number>,
  wardClassifications?: Record<string, string>,
  demographicTurnout?: Record<string, number>,
): Prediction[] {
  const { baseElectionYear, baseRaceType, turnoutChange } = params;
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

    const effectiveTurnout = getEffectiveTurnout(
      ward.wardId, turnoutChange, wardRegions, regionalTurnout,
      wardClassifications, demographicTurnout,
    );
    const turnoutMultiplier = 1 + effectiveTurnout / 100;

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

function predictDemographic(
  wardData: WardData[],
  params: WorkerRequest['params'],
  wardClassifications?: Record<string, string>,
  wardRegions?: Record<string, string>,
  regionalTurnout?: Record<string, number>,
  demographicTurnout?: Record<string, number>,
): Prediction[] {
  const { baseElectionYear, baseRaceType, turnoutChange } = params;
  const urbanSwing = params.urbanSwing ?? 0;
  const suburbanSwing = params.suburbanSwing ?? 0;
  const ruralSwing = params.ruralSwing ?? 0;
  const year = Number(baseElectionYear);

  return wardData.map((ward) => {
    const election = findElection(ward, year, baseRaceType);
    if (!election) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

    const twoPartyBase = election.demVotes + election.repVotes;
    if (twoPartyBase === 0) return { wardId: ward.wardId, ...NO_DATA_PREDICTION };

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
    const baseDemTwoParty = election.demVotes / twoPartyBase;
    const adjustedDemTwoParty = Math.max(0.01, Math.min(0.99, baseDemTwoParty + swing));

    const effectiveTurnout = getEffectiveTurnout(
      ward.wardId, turnoutChange, wardRegions, regionalTurnout,
      wardClassifications, demographicTurnout,
    );
    const turnoutMultiplier = 1 + effectiveTurnout / 100;

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
      confidence: 0.5,
    };
  });
}

function computeUncertainty(
  wardData: WardData[],
  predictions: Prediction[],
  baseRaceType: string,
): UncertaintyBand[] {
  const predMap = new Map(predictions.map((p) => [p.wardId, p]));

  return wardData.map((ward) => {
    const pred = predMap.get(ward.wardId);
    if (!pred) {
      return {
        wardId: ward.wardId,
        lowerDemPct: 0,
        upperDemPct: 100,
        lowerMargin: -100,
        upperMargin: 100,
      };
    }

    // Factors that affect confidence:
    // 1. Number of elections analyzed
    const relevantElections = ward.elections.filter((e) => e.raceType === baseRaceType);
    const electionCount = relevantElections.length;

    // 2. Volatility (standard deviation of historical margins)
    let volatility = 10; // default high uncertainty
    if (electionCount >= 2) {
      const margins = relevantElections.map((e) => e.margin);
      const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
      const variance = margins.reduce((a, b) => a + (b - mean) ** 2, 0) / margins.length;
      volatility = Math.sqrt(variance);
    }

    // 3. Is estimate penalty
    const hasEstimates = relevantElections.some((e) => e.isEstimate);

    // Compute confidence (0-1)
    let confidence = 0.3; // base
    confidence += Math.min(0.3, electionCount * 0.05); // +0.05 per election, max 0.3
    confidence += Math.max(0, 0.3 - volatility * 0.02); // lower volatility = higher confidence
    if (hasEstimates) confidence -= 0.1;
    confidence = Math.max(0.1, Math.min(0.9, confidence));

    // Uncertainty band width based on confidence
    const bandWidth = (1 - confidence) * 20; // max +/- 10 points at lowest confidence

    return {
      wardId: ward.wardId,
      lowerDemPct: Math.max(0, pred.predictedDemPct - bandWidth),
      upperDemPct: Math.min(100, pred.predictedDemPct + bandWidth),
      lowerMargin: pred.predictedMargin - bandWidth * 2,
      upperMargin: pred.predictedMargin + bandWidth * 2,
    };
  });
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const {
    wardData, params, modelType, wardRegions, regionalSwing,
    wardClassifications, regionalTurnout, demographicTurnout,
    computeUncertainty: shouldComputeUncertainty,
  } = e.data;

  let predictions: Prediction[];
  if (modelType === 'demographic-swing') {
    predictions = predictDemographic(
      wardData, params, wardClassifications,
      wardRegions, regionalTurnout, demographicTurnout,
    );
  } else if (modelType === 'proportional-swing') {
    predictions = predictProportional(
      wardData, params, wardRegions, regionalSwing,
      regionalTurnout, wardClassifications, demographicTurnout,
    );
  } else {
    predictions = predictUniform(
      wardData, params, wardRegions, regionalSwing,
      regionalTurnout, wardClassifications, demographicTurnout,
    );
  }

  const response: WorkerResponse = { predictions };

  if (shouldComputeUncertainty) {
    response.uncertainty = computeUncertainty(wardData, predictions, params.baseRaceType);
  }

  self.postMessage(response);
};
