// Web Worker for Wisconsin primary election simulation
// Runs softmax candidate scoring and Monte Carlo simulations off the main thread
//
// CRITICAL: Web Workers cannot import from the main bundle.
// All type declarations and computation functions are duplicated inline.
// This mirrors the pattern in swing-modeler/model.worker.ts.

// ---------------------------------------------------------------------------
// 1. Inline Type Declarations (mirror @/types/primary)
// ---------------------------------------------------------------------------

interface CandidateProfile {
  id: string;
  name: string;
  pollingBaseline: number;
  geographicBaseCoords: [number, number];
  geographicRadius: number;
  ideologyScore: number;
  affinityBlack: number;
  affinityHispanic: number;
  affinityCollege: number;
  affinityWorkingClass: number;
  affinityUrban: number;
  affinitySuburban: number;
  affinityRural: number;
  endorsementStrength: number;
  isActive: boolean;
}

interface GlobalParams {
  turnoutRate: number;
  temperature: number;
  geoWeight: number;
  ideologyWeight: number;
  demographicWeight: number;
  endorsementWeight: number;
}

interface WardData {
  ruId: string;
  county: string;
  centroidLng: number;
  centroidLat: number;
  blackPct: number;
  hispanicPct: number;
  collegePct: number;
  medianIncome: number;
  populationDensity: number;
  urbanRuralClass: 'urban' | 'suburban' | 'rural';
  votingAgePopulation: number;
  partisanLean: number;
}

interface CandidateVote {
  candidateId: string;
  voteShare: number;
  votes: number;
}

interface RuPrediction {
  ruId: string;
  totalVotes: number;
  candidates: CandidateVote[];
  winnerId: string;
  winnerMargin: number;
}

interface MonteCarloResult {
  candidateId: string;
  winProbability: number;
  medianVoteShare: number;
  p10VoteShare: number;
  p90VoteShare: number;
  medianVotes: number;
}

interface WorkerRequest {
  type: 'predict' | 'monteCarlo';
  candidates: CandidateProfile[];
  wardData: WardData[];
  globalParams: GlobalParams;
  monteCarloIterations?: number;
}

interface WorkerResponse {
  type: 'predictions' | 'monteCarlo';
  predictions?: RuPrediction[];
  monteCarlo?: MonteCarloResult[];
  statewideTotals?: CandidateVote[];
  computeTimeMs: number;
}

// ---------------------------------------------------------------------------
// 2. Utility Functions
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// 3. Model Functions (duplicated from primaryModel.ts -- workers cannot import)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Haversine distance between two geographic points in kilometers.
 */
function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Geographic proximity score using Gaussian decay from candidate base.
 * Score = geoWeight * exp(-(dist^2) / (2 * radius^2))
 */
function computeGeographicScore(
  ward: WardData,
  candidate: CandidateProfile,
  geoWeight: number,
): number {
  const dist = haversineDistance(
    ward.centroidLng,
    ward.centroidLat,
    candidate.geographicBaseCoords[0],
    candidate.geographicBaseCoords[1],
  );
  const radius = candidate.geographicRadius;
  if (radius <= 0) return 0;
  return geoWeight * Math.exp(-(dist * dist) / (2 * radius * radius));
}

/**
 * Demographic affinity score combining urban/rural, race, education, and income matches.
 * Score = demoWeight * (urbanMatch + raceMatch + educationMatch + incomeMatch) / 4
 */
function computeDemographicScore(
  ward: WardData,
  candidate: CandidateProfile,
  demoWeight: number,
): number {
  let urbanMatch: number;
  switch (ward.urbanRuralClass) {
    case 'urban':
      urbanMatch = candidate.affinityUrban;
      break;
    case 'suburban':
      urbanMatch = candidate.affinitySuburban;
      break;
    case 'rural':
      urbanMatch = candidate.affinityRural;
      break;
    default:
      urbanMatch = 0.5;
  }

  const blackPct = ward.blackPct / 100;
  const hispanicPct = ward.hispanicPct / 100;
  const raceMatch =
    candidate.affinityBlack * blackPct +
    candidate.affinityHispanic * hispanicPct +
    (1 - candidate.affinityBlack) * (1 - blackPct);

  const collegePct = ward.collegePct / 100;
  const educationMatch =
    candidate.affinityCollege * collegePct +
    candidate.affinityWorkingClass * (1 - collegePct);

  const WI_MEDIAN_INCOME = 67000;
  const incomeDeviation = (ward.medianIncome - WI_MEDIAN_INCOME) / WI_MEDIAN_INCOME;
  const incomeMatch = clamp(
    0.5 + incomeDeviation * (candidate.affinityCollege - candidate.affinityWorkingClass),
    0,
    1,
  );

  return demoWeight * (urbanMatch + raceMatch + educationMatch + incomeMatch) / 4;
}

/**
 * Ideology match score using spatial distance on a 0-10 ideology scale.
 */
function computeIdeologyScore(
  ward: WardData,
  candidate: CandidateProfile,
  ideoWeight: number,
): number {
  const clampedLean = clamp(ward.partisanLean, -50, 50);
  const wardIdeology = 5 - (clampedLean / 10);
  const distance = Math.abs(candidate.ideologyScore - wardIdeology);
  return ideoWeight * (1 - distance / 10);
}

/**
 * Endorsement / organizational strength score.
 */
function computeEndorsementScore(
  candidate: CandidateProfile,
  endorsementWeight: number,
): number {
  return endorsementWeight * candidate.endorsementStrength;
}

/**
 * Combined candidate score for a given ward.
 */
function computeCandidateScore(
  ward: WardData,
  candidate: CandidateProfile,
  params: GlobalParams,
): number {
  const baselineScore = Math.log(candidate.pollingBaseline / 100 + 0.001);
  const geoScore = computeGeographicScore(ward, candidate, params.geoWeight);
  const demoScore = computeDemographicScore(ward, candidate, params.demographicWeight);
  const ideoScore = computeIdeologyScore(ward, candidate, params.ideologyWeight);
  const endorseScore = computeEndorsementScore(candidate, params.endorsementWeight);

  return baselineScore + geoScore + demoScore + ideoScore + endorseScore;
}

/**
 * Numerically stable softmax: converts raw scores to probability distribution.
 * Subtracts max for numerical stability, then applies temperature scaling.
 */
function softmax(scores: number[], temperature: number): number[] {
  const n = scores.length;
  if (n === 0) return [];
  if (n === 1) return [1.0];

  const T = Math.max(0.01, temperature);

  let maxScore = -Infinity;
  for (let i = 0; i < n; i++) {
    if (scores[i] > maxScore) maxScore = scores[i];
  }

  const exps = new Array<number>(n);
  let sumExp = 0;
  for (let i = 0; i < n; i++) {
    exps[i] = Math.exp((scores[i] - maxScore) / T);
    sumExp += exps[i];
  }

  if (sumExp === 0) {
    const uniform = 1 / n;
    return new Array<number>(n).fill(uniform);
  }

  const result = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    result[i] = exps[i] / sumExp;
  }
  return result;
}

/**
 * Compute turnout for a ward based on demographic adjustments.
 * Base: VAP * (turnoutRate/100), then urban/rural and partisan multipliers.
 */
function computeTurnout(ward: WardData, turnoutRate: number): number {
  const vap = ward.votingAgePopulation;
  if (vap <= 0) return 0;

  const baseRate = turnoutRate / 100;

  let urbanMultiplier: number;
  switch (ward.urbanRuralClass) {
    case 'urban':
      urbanMultiplier = 0.95;
      break;
    case 'suburban':
      urbanMultiplier = 1.05;
      break;
    case 'rural':
      urbanMultiplier = 1.0;
      break;
    default:
      urbanMultiplier = 1.0;
  }

  const absLean = Math.abs(ward.partisanLean);
  const partisanMultiplier = 1 + clamp(absLean - 20, 0, 30) * 0.003;

  const turnout = Math.round(vap * baseRate * urbanMultiplier * partisanMultiplier);
  return Math.max(0, turnout);
}

/**
 * Main prediction function: computes candidate vote shares and totals for each ward.
 * Filters to active candidates, scores each, applies softmax, distributes votes.
 */
function predictPrimary(
  wards: WardData[],
  candidates: CandidateProfile[],
  params: GlobalParams,
): RuPrediction[] {
  const activeCandidates = candidates.filter(c => c.isActive);
  const numCandidates = activeCandidates.length;

  // Edge case: no active candidates
  if (numCandidates === 0) {
    return wards.map(ward => ({
      ruId: ward.ruId,
      totalVotes: 0,
      candidates: [],
      winnerId: '',
      winnerMargin: 0,
    }));
  }

  // Edge case: single candidate -- they get 100%
  if (numCandidates === 1) {
    const candidate = activeCandidates[0];
    return wards.map(ward => {
      const totalVotes = computeTurnout(ward, params.turnoutRate);
      return {
        ruId: ward.ruId,
        totalVotes,
        candidates: [{
          candidateId: candidate.id,
          voteShare: 1.0,
          votes: totalVotes,
        }],
        winnerId: candidate.id,
        winnerMargin: 1.0,
      };
    });
  }

  // Pre-allocate scores array (reused per ward to avoid GC pressure)
  const scores = new Array<number>(numCandidates);

  return wards.map(ward => {
    const totalVotes = computeTurnout(ward, params.turnoutRate);

    if (totalVotes === 0) {
      return {
        ruId: ward.ruId,
        totalVotes: 0,
        candidates: activeCandidates.map(c => ({
          candidateId: c.id,
          voteShare: 1 / numCandidates,
          votes: 0,
        })),
        winnerId: activeCandidates[0].id,
        winnerMargin: 0,
      };
    }

    for (let i = 0; i < numCandidates; i++) {
      scores[i] = computeCandidateScore(ward, activeCandidates[i], params);
    }

    const shares = softmax(scores, params.temperature);

    let allocatedVotes = 0;
    const candidateVotes: CandidateVote[] = new Array(numCandidates);
    for (let i = 0; i < numCandidates; i++) {
      const votes = Math.round(shares[i] * totalVotes);
      candidateVotes[i] = {
        candidateId: activeCandidates[i].id,
        voteShare: shares[i],
        votes,
      };
      allocatedVotes += votes;
    }

    const roundingError = totalVotes - allocatedVotes;
    if (roundingError !== 0) {
      let largestIdx = 0;
      for (let i = 1; i < numCandidates; i++) {
        if (candidateVotes[i].voteShare > candidateVotes[largestIdx].voteShare) {
          largestIdx = i;
        }
      }
      candidateVotes[largestIdx].votes += roundingError;
    }

    let maxVotes = -1;
    let secondMaxVotes = -1;
    let winnerId = '';
    for (let i = 0; i < numCandidates; i++) {
      if (candidateVotes[i].votes > maxVotes) {
        secondMaxVotes = maxVotes;
        maxVotes = candidateVotes[i].votes;
        winnerId = candidateVotes[i].candidateId;
      } else if (candidateVotes[i].votes > secondMaxVotes) {
        secondMaxVotes = candidateVotes[i].votes;
      }
    }

    const winnerMargin = totalVotes > 0
      ? (maxVotes - Math.max(0, secondMaxVotes)) / totalVotes
      : 0;

    return {
      ruId: ward.ruId,
      totalVotes,
      candidates: candidateVotes,
      winnerId,
      winnerMargin,
    };
  });
}

/**
 * Aggregate ward-level predictions to statewide totals.
 */
function aggregateStatewide(
  predictions: RuPrediction[],
  candidates: CandidateProfile[],
): CandidateVote[] {
  const activeCandidates = candidates.filter(c => c.isActive);
  const totalsMap = new Map<string, number>();
  let grandTotal = 0;

  activeCandidates.forEach(c => totalsMap.set(c.id, 0));

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    grandTotal += pred.totalVotes;
    for (let j = 0; j < pred.candidates.length; j++) {
      const cv = pred.candidates[j];
      totalsMap.set(cv.candidateId, (totalsMap.get(cv.candidateId) || 0) + cv.votes);
    }
  }

  return activeCandidates.map(c => {
    const votes = totalsMap.get(c.id) || 0;
    return {
      candidateId: c.id,
      voteShare: grandTotal > 0 ? votes / grandTotal : 0,
      votes,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Monte Carlo Simulation
// ---------------------------------------------------------------------------

/**
 * Run Monte Carlo simulation with parameter perturbation.
 * Each iteration perturbs candidate baselines, demographics, turnout, and temperature,
 * then runs a full prediction pass. Aggregates win counts and vote share distributions.
 */
function runMonteCarlo(
  wards: WardData[],
  candidates: CandidateProfile[],
  params: GlobalParams,
  iterations: number = 5000,
): { monteCarlo: MonteCarloResult[]; statewideTotals: CandidateVote[] } {
  const activeCandidates = candidates.filter(c => c.isActive);
  const candidateIds = activeCandidates.map(c => c.id);
  const n = candidateIds.length;

  if (n === 0) {
    return {
      monteCarlo: [],
      statewideTotals: [],
    };
  }

  const winCounts = new Map<string, number>();
  const voteShares = new Map<string, number[]>();
  const voteTotals = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    winCounts.set(candidateIds[i], 0);
    voteShares.set(candidateIds[i], new Array<number>(iterations));
    voteTotals.set(candidateIds[i], new Array<number>(iterations));
  }

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Perturb each candidate polling baseline (Dirichlet-like noise)
    const perturbedCandidates = activeCandidates.map(c => ({
      ...c,
      pollingBaseline: Math.max(0.5, c.pollingBaseline + (Math.random() - 0.5) * 8),
      affinityBlack: clamp(c.affinityBlack + (Math.random() - 0.5) * 0.15, 0, 1),
      affinityHispanic: clamp(c.affinityHispanic + (Math.random() - 0.5) * 0.15, 0, 1),
      affinityCollege: clamp(c.affinityCollege + (Math.random() - 0.5) * 0.15, 0, 1),
      affinityWorkingClass: clamp(c.affinityWorkingClass + (Math.random() - 0.5) * 0.15, 0, 1),
      affinityUrban: clamp(c.affinityUrban + (Math.random() - 0.5) * 0.1, 0, 1),
      affinitySuburban: clamp(c.affinitySuburban + (Math.random() - 0.5) * 0.1, 0, 1),
      affinityRural: clamp(c.affinityRural + (Math.random() - 0.5) * 0.1, 0, 1),
    }));

    // 2. Perturb global parameters (turnout, temperature)
    const perturbedParams: GlobalParams = {
      ...params,
      turnoutRate: params.turnoutRate + (Math.random() - 0.5) * 4,
      temperature: Math.max(0.3, params.temperature + (Math.random() - 0.5) * 0.3),
    };

    // 3. Run full prediction pass
    const predictions = predictPrimary(wards, perturbedCandidates, perturbedParams);
    const statewide = aggregateStatewide(predictions, perturbedCandidates);

    // 4. Record results
    const totalVotes = statewide.reduce((sum, c) => sum + c.votes, 0);
    let maxVotes = 0;
    let winnerId = '';

    for (let j = 0; j < statewide.length; j++) {
      const c = statewide[j];
      const share = totalVotes > 0 ? c.votes / totalVotes : 0;
      const sharesArr = voteShares.get(c.candidateId);
      const totalsArr = voteTotals.get(c.candidateId);
      if (sharesArr) sharesArr[iter] = share;
      if (totalsArr) totalsArr[iter] = c.votes;
      if (c.votes > maxVotes) {
        maxVotes = c.votes;
        winnerId = c.candidateId;
      }
    }

    if (winnerId) {
      winCounts.set(winnerId, (winCounts.get(winnerId) || 0) + 1);
    }
  }

  // Compute summary statistics
  const monteCarlo: MonteCarloResult[] = candidateIds.map(id => {
    const shares = voteShares.get(id) || [];
    const totals = voteTotals.get(id) || [];

    // Sort for percentile computation (in-place for performance)
    shares.sort((a, b) => a - b);
    totals.sort((a, b) => a - b);

    return {
      candidateId: id,
      winProbability: (winCounts.get(id) || 0) / iterations,
      medianVoteShare: percentile(shares, 0.5),
      p10VoteShare: percentile(shares, 0.1),
      p90VoteShare: percentile(shares, 0.9),
      medianVotes: percentile(totals, 0.5),
    };
  });

  // Also compute deterministic (non-perturbed) statewide totals for the base case
  const basePredictions = predictPrimary(wards, activeCandidates, params);
  const statewideTotals = aggregateStatewide(basePredictions, activeCandidates);

  return { monteCarlo, statewideTotals };
}

/**
 * Get the value at a given percentile from a sorted array.
 * Uses nearest-rank method.
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor(sortedArr.length * p);
  return sortedArr[Math.min(idx, sortedArr.length - 1)];
}

// ---------------------------------------------------------------------------
// 5. Message Handler
// ---------------------------------------------------------------------------

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, candidates, wardData, globalParams, monteCarloIterations } = e.data;
  const start = performance.now();

  if (type === 'predict') {
    const activeCandidates = candidates.filter(c => c.isActive);
    const predictions = predictPrimary(wardData, activeCandidates, globalParams);
    const statewideTotals = aggregateStatewide(predictions, activeCandidates);

    const response: WorkerResponse = {
      type: 'predictions',
      predictions,
      statewideTotals,
      computeTimeMs: performance.now() - start,
    };
    self.postMessage(response);
  } else if (type === 'monteCarlo') {
    const { monteCarlo, statewideTotals } = runMonteCarlo(
      wardData,
      candidates,
      globalParams,
      monteCarloIterations || 5000,
    );

    const response: WorkerResponse = {
      type: 'monteCarlo',
      monteCarlo,
      statewideTotals,
      computeTimeMs: performance.now() - start,
    };
    self.postMessage(response);
  }
};
