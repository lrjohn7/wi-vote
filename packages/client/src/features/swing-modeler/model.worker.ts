// Web Worker for uniform swing model computation
// Duplicates predict logic from uniform-swing.ts since workers have separate module scope

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
}

interface WorkerResponse {
  predictions: Prediction[];
}

function predict(wardData: WardData[], params: WorkerRequest['params']): Prediction[] {
  const { baseElectionYear, baseRaceType, swingPoints, turnoutChange } = params;
  const swing = swingPoints / 100;
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
      confidence: 0.7,
    };
  });
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { wardData, params } = e.data;
  const predictions = predict(wardData, params);
  self.postMessage({ predictions } satisfies WorkerResponse);
};
