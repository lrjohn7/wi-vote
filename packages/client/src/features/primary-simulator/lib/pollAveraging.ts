/**
 * EWMA (Exponentially Weighted Moving Average) poll averaging engine.
 *
 * Implements the industry-standard approach used by 538, Silver Bulletin, and
 * VoteHub for computing weighted polling averages across multiple polls.
 *
 * Weight components per poll:
 *   w_composite = w_recency * w_sample * w_quality * w_frequency * w_partisan
 *
 * This is a pure function module with no React dependencies.
 */

import type {
  PrimaryPoll,
  PollAveragingConfig,
  PollAverageResult,
  PollWeightBreakdown,
} from '@/types/primary';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default averaging configuration for a sparsely-polled primary race. */
export const DEFAULT_AVERAGING_CONFIG: PollAveragingConfig = {
  halfLifeDays: 25,
  frequencyDampening: true,
  partisanPenalty: true,
  referenceDate: new Date().toISOString().slice(0, 10),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Number of days between two ISO date strings. */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

/** Median sample size for normalization (typical primary poll). */
const MEDIAN_SAMPLE_SIZE = 600;

/** Max sample size cap to prevent mega-poll dominance. */
const MAX_SAMPLE_SIZE = 5000;

/** Max pollster rating (top of scale). */
const MAX_RATING = 3.0;

/** Window in days for frequency dampening calculation. */
const FREQUENCY_WINDOW_DAYS = 14;

// ---------------------------------------------------------------------------
// Weight computation
// ---------------------------------------------------------------------------

/**
 * Counts how many enabled polls each pollster has within the frequency window.
 */
function computePollsterCounts(
  polls: PrimaryPoll[],
  referenceDate: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const poll of polls) {
    const daysOld = daysBetween(poll.endDate, referenceDate);
    if (daysOld <= FREQUENCY_WINDOW_DAYS) {
      counts.set(poll.pollster, (counts.get(poll.pollster) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Computes the composite weight breakdown for a single poll.
 *
 * - Recency:   0.5^(days_old / halfLife)
 * - Sample:    sqrt(min(n, 5000)) / sqrt(600)
 * - Quality:   sqrt(rating / 3.0)
 * - Frequency: 1 / sqrt(n_polls_from_same_pollster_in_14d)
 * - Partisan:  0.7 if partisan, 1.0 otherwise
 */
function computePollWeight(
  poll: PrimaryPoll,
  config: PollAveragingConfig,
  pollsterCounts: Map<string, number>,
): PollWeightBreakdown {
  // Recency
  const daysOld = daysBetween(poll.endDate, config.referenceDate);
  const recencyWeight = Math.pow(0.5, daysOld / config.halfLifeDays);

  // Sample size (sqrt-based, capped)
  const cappedSample = Math.min(poll.sampleSize, MAX_SAMPLE_SIZE);
  const sampleWeight = Math.sqrt(cappedSample) / Math.sqrt(MEDIAN_SAMPLE_SIZE);

  // Pollster quality
  const clampedRating = Math.max(0.1, Math.min(MAX_RATING, poll.pollsterRating));
  const qualityWeight = Math.sqrt(clampedRating / MAX_RATING);

  // Frequency dampening
  let frequencyWeight = 1.0;
  if (config.frequencyDampening) {
    const count = pollsterCounts.get(poll.pollster) ?? 1;
    frequencyWeight = 1 / Math.sqrt(count);
  }

  // Partisan penalty
  let partisanWeight = 1.0;
  if (config.partisanPenalty && poll.isPartisan) {
    partisanWeight = 0.7;
  }

  const compositeWeight =
    recencyWeight * sampleWeight * qualityWeight * frequencyWeight * partisanWeight;

  return {
    pollId: poll.id,
    recencyWeight,
    sampleWeight,
    qualityWeight,
    frequencyWeight,
    partisanWeight,
    compositeWeight,
    normalizedWeight: 0, // filled after normalization
  };
}

// ---------------------------------------------------------------------------
// Main averaging function
// ---------------------------------------------------------------------------

/**
 * Computes the EWMA-weighted polling average across all enabled polls.
 *
 * @param polls         All polls (only enabled ones are used)
 * @param config        Averaging configuration
 * @param candidateIds  List of candidate IDs to compute averages for
 * @returns Per-candidate averages, weighted undecided %, and per-poll weight breakdowns
 */
export function computePollingAverage(
  polls: PrimaryPoll[],
  config: PollAveragingConfig,
  candidateIds: string[],
): {
  averages: PollAverageResult[];
  undecided: number;
  weights: PollWeightBreakdown[];
} {
  const enabledPolls = polls.filter((p) => p.isEnabled);

  // No polls → return zeros
  if (enabledPolls.length === 0) {
    return {
      averages: candidateIds.map((id) => ({ candidateId: id, average: 0, pollCount: 0 })),
      undecided: 0,
      weights: [],
    };
  }

  // Compute pollster frequency counts for dampening
  const pollsterCounts = computePollsterCounts(enabledPolls, config.referenceDate);

  // Compute weight breakdown for each poll
  const weights = enabledPolls.map((poll) =>
    computePollWeight(poll, config, pollsterCounts),
  );

  // Normalize composite weights to sum to 1
  const totalWeight = weights.reduce((sum, w) => sum + w.compositeWeight, 0);
  for (const w of weights) {
    w.normalizedWeight = totalWeight > 0 ? w.compositeWeight / totalWeight : 0;
  }

  // Weighted average per candidate
  const averages: PollAverageResult[] = candidateIds.map((candidateId) => {
    let weightedSum = 0;
    let weightSum = 0;
    let pollCount = 0;

    for (let i = 0; i < enabledPolls.length; i++) {
      const pct = enabledPolls[i].candidates[candidateId];
      if (pct != null && pct >= 0) {
        weightedSum += pct * weights[i].normalizedWeight;
        weightSum += weights[i].normalizedWeight;
        pollCount++;
      }
    }

    return {
      candidateId,
      average: weightSum > 0 ? weightedSum / weightSum : 0,
      pollCount,
    };
  });

  // Weighted average of undecided
  let undecidedSum = 0;
  let undecidedWeightSum = 0;
  for (let i = 0; i < enabledPolls.length; i++) {
    undecidedSum += enabledPolls[i].undecided * weights[i].normalizedWeight;
    undecidedWeightSum += weights[i].normalizedWeight;
  }
  const undecided = undecidedWeightSum > 0 ? undecidedSum / undecidedWeightSum : 0;

  return { averages, undecided, weights };
}
