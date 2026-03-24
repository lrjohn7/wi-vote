// Web Worker for Wisconsin primary election simulation
// Runs softmax candidate scoring and Monte Carlo simulations off the main thread
//
// All scoring and prediction functions are imported from primaryModel.ts
// to maintain a single source of truth and prevent formula divergence.

import {
  clamp,
  predictPrimary,
  aggregateStatewide,
} from './lib/primaryModel';
import type {
  CandidateProfile,
  GlobalParams,
  PrimaryWardData,
  CandidateVote,
  RuPrediction,
} from './lib/primaryModel';

// ---------------------------------------------------------------------------
// Worker-specific types
// ---------------------------------------------------------------------------

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
  wardData: PrimaryWardData[];
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
// Monte Carlo Simulation
// ---------------------------------------------------------------------------

/**
 * Run Monte Carlo simulation with parameter perturbation.
 * Each iteration perturbs candidate baselines, demographics, turnout, and temperature,
 * then runs a full prediction pass. Aggregates win counts and vote share distributions.
 */
function runMonteCarlo(
  wards: PrimaryWardData[],
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
// Message Handler
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
