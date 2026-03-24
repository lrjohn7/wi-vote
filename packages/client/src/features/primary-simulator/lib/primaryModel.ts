/**
 * primaryModel.ts -- Core mathematical engine for the Wisconsin primary election simulator.
 *
 * All functions are pure (no side effects, no DOM, no state management) so they
 * can be called from both the main thread and a Web Worker.
 *
 * Performance target: ~3,500 wards x 8 candidates in < 200ms.
 */

// ---------------------------------------------------------------------------
// Inline type declarations (mirror @/types/primary -- kept here so this file
// can be consumed by a Web Worker without import path resolution)
// ---------------------------------------------------------------------------

/** A single candidate with polling, geography, ideology, and demographic affinities. */
export interface CandidateProfile {
  id: string;
  name: string;
  /** Statewide polling baseline, 0-100 */
  pollingBaseline: number;
  /** [lng, lat] of the candidate's geographic base (home city, stronghold) */
  geographicBaseCoords: [number, number];
  /** Radius in km for geographic decay */
  geographicRadius: number;
  /** 1 = very progressive, 10 = very conservative */
  ideologyScore: number;
  /** Affinity factors 0-1 */
  affinityBlack: number;
  affinityHispanic: number;
  affinityCollege: number;
  affinityWorkingClass: number;
  affinityUrban: number;
  affinitySuburban: number;
  affinityRural: number;
  /** Overall endorsement / name-recognition boost 0-1 */
  endorsementStrength: number;
  /** Whether this candidate is currently active in the race */
  isActive: boolean;
}

/** Global parameters that control relative weight of each scoring dimension. */
export interface GlobalParams {
  /** Percentage of voting-age population expected to turn out (0-100) */
  turnoutRate: number;
  /** Softmax temperature -- higher = more uniform, lower = more winner-take-all */
  temperature: number;
  /** Weight for geographic proximity score */
  geoWeight: number;
  /** Weight for ideological match score */
  ideologyWeight: number;
  /** Weight for demographic affinity score */
  demographicWeight: number;
  /** Weight for endorsement / name-recognition score */
  endorsementWeight: number;
}

/** Ward-level data used as input to the model. */
export interface PrimaryWardData {
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
  /** Partisan lean: positive = D, negative = R */
  partisanLean: number;
}

/** Per-candidate vote result within a ward. */
export interface CandidateVote {
  candidateId: string;
  voteShare: number;
  votes: number;
}

/** Full prediction for a single reporting unit (ward). */
export interface RuPrediction {
  ruId: string;
  totalVotes: number;
  candidates: CandidateVote[];
  winnerId: string;
  winnerMargin: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate radius of the Earth in kilometers. */
const EARTH_RADIUS_KM = 6371;

/** Wisconsin median household income, used to normalize income to 0-1 scale. */
const WI_MEDIAN_INCOME = 67000;

/** Conversion factor: degrees to radians. */
const DEG_TO_RAD = Math.PI / 180;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// 1. Haversine Distance
// ---------------------------------------------------------------------------

/**
 * Computes the great-circle distance in kilometers between two points
 * specified as (longitude, latitude) in decimal degrees.
 *
 * Uses the Haversine formula, accurate for any distance on the globe.
 *
 * @param lng1 - Longitude of point 1
 * @param lat1 - Latitude of point 1
 * @param lng2 - Longitude of point 2
 * @param lat2 - Latitude of point 2
 * @returns Distance in kilometers
 */
export function haversineDistance(
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

// ---------------------------------------------------------------------------
// 2. Geographic Score
// ---------------------------------------------------------------------------

/**
 * Computes the geographic proximity bonus for a candidate in a specific ward.
 *
 * Uses Gaussian decay: geoWeight * exp(-(d^2) / (2 * r^2)) where d is the
 * haversine distance from the ward centroid to the candidate's base coordinates
 * and r is the candidate's geographic radius.
 *
 * Returns a value near geoWeight when the ward is at the candidate's base,
 * decaying toward 0 at distances >> radius.
 *
 * @param ward - Ward data with centroid coordinates
 * @param candidate - Candidate with base coordinates and radius
 * @param geoWeight - Weight multiplier for the geographic score
 * @returns Geographic proximity score (0 to geoWeight)
 */
export function computeGeographicScore(
  ward: PrimaryWardData,
  candidate: CandidateProfile,
  geoWeight: number,
): number {
  if (geoWeight === 0) return 0;

  const distance = haversineDistance(
    ward.centroidLng,
    ward.centroidLat,
    candidate.geographicBaseCoords[0],
    candidate.geographicBaseCoords[1],
  );

  const radius = candidate.geographicRadius;
  // Guard against zero or negative radius (would produce NaN or Infinity)
  if (radius <= 0) return 0;

  const exponent = -(distance * distance) / (2 * radius * radius);
  return geoWeight * Math.exp(exponent);
}

// ---------------------------------------------------------------------------
// 3. Demographic Score
// ---------------------------------------------------------------------------

/**
 * Computes how well a candidate matches a ward's demographic profile.
 *
 * Components (all scaled 0-1 before weighting):
 *  - Urban/suburban/rural: one-hot match against candidate affinity
 *  - Race: affinityBlack * blackPct + affinityHispanic * hispanicPct
 *  - Education: affinityCollege * collegePct + affinityWorkingClass * (1-collegePct)
 *  - Income: normalized around WI median ($67K), sigmoid-shaped, blends
 *    college/working-class affinities
 *
 * @param ward - Ward data with demographic information
 * @param candidate - Candidate with demographic affinity scores
 * @param demoWeight - Weight multiplier for the demographic score
 * @returns Demographic affinity score
 */
export function computeDemographicScore(
  ward: PrimaryWardData,
  candidate: CandidateProfile,
  demoWeight: number,
): number {
  if (demoWeight === 0) return 0;

  // Urban/suburban/rural -- one-hot encoding
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

  // Race/ethnicity (ward values are 0-100 percentages)
  const blackPct = ward.blackPct / 100;
  const hispanicPct = ward.hispanicPct / 100;
  const raceMatch =
    candidate.affinityBlack * blackPct +
    candidate.affinityHispanic * hispanicPct +
    (1 - candidate.affinityBlack) * (1 - blackPct);

  // Education
  const collegePct = ward.collegePct / 100;
  const educationMatch =
    candidate.affinityCollege * collegePct +
    candidate.affinityWorkingClass * (1 - collegePct);

  // Income: deviation-based formula centered on WI median.
  const incomeDeviation = (ward.medianIncome - WI_MEDIAN_INCOME) / WI_MEDIAN_INCOME;
  const incomeMatch = clamp(
    0.5 + incomeDeviation * (candidate.affinityCollege - candidate.affinityWorkingClass),
    0,
    1,
  );

  // Normalize by dividing by 4 (number of components) to keep score in ~[0, 1]
  return demoWeight * (urbanMatch + raceMatch + educationMatch + incomeMatch) / 4;
}

// ---------------------------------------------------------------------------
// 4. Ideology Score
// ---------------------------------------------------------------------------

/**
 * Computes ideological match between a candidate and a ward.
 *
 * Maps the ward's partisan lean (positive = D) to a ward ideology estimate
 * on a 1-10 scale (lower = more progressive), then computes a proximity
 * score where candidates closest to the ward's ideological position score
 * highest.
 *
 * Uses piecewise linear interpolation for smooth transitions between
 * ideology brackets rather than hard steps.
 *
 * Score = ideoWeight * max(0, 1 - |candidateIdeology - wardIdeology| / 10)
 *
 * @param ward - Ward data with partisan lean
 * @param candidate - Candidate with ideology score (1-10)
 * @param ideoWeight - Weight multiplier for the ideology score
 * @returns Ideological proximity score
 */
export function computeIdeologyScore(
  ward: PrimaryWardData,
  candidate: CandidateProfile,
  ideoWeight: number,
): number {
  if (ideoWeight === 0) return 0;

  // Map partisan lean to ward ideology on a 1-10 scale (lower = more progressive).
  // Linear mapping: lean of +50 → ideology 0, lean of 0 → ideology 5, lean of -50 → ideology 10.
  const clampedLean = clamp(ward.partisanLean, -50, 50);
  const wardIdeology = 5 - (clampedLean / 10);

  const distance = Math.abs(candidate.ideologyScore - wardIdeology);
  return ideoWeight * (1 - distance / 10);
}

// ---------------------------------------------------------------------------
// 5. Endorsement Score
// ---------------------------------------------------------------------------

/**
 * Computes a flat endorsement / name-recognition bonus for a candidate.
 *
 * This is ward-independent in the current model. Future versions could add
 * geographically-targeted endorsements (e.g., a Milwaukee mayor endorsement
 * boosting a candidate in Milwaukee-area wards).
 *
 * @param candidate - Candidate with endorsement strength (0-1)
 * @param endorsementWeight - Weight multiplier
 * @returns Endorsement score
 */
export function computeEndorsementScore(
  candidate: CandidateProfile,
  endorsementWeight: number,
): number {
  return endorsementWeight * candidate.endorsementStrength;
}

// ---------------------------------------------------------------------------
// 6. Combined Candidate Score
// ---------------------------------------------------------------------------

/**
 * Computes the total utility score for a single candidate in a single ward.
 *
 * Combines:
 *  - Log-baseline from statewide polling (ensures polling is the strongest signal)
 *  - Geographic proximity score
 *  - Demographic affinity score
 *  - Ideological match score
 *  - Endorsement bonus
 *
 * The log-baseline maps polling % to log-space so that a candidate at 40%
 * has a much stronger base than one at 5%, but the relationship is sub-linear
 * (doubling from 20% to 40% matters more than doubling from 40% to 80%).
 *
 * @param ward - Ward data
 * @param candidate - Candidate profile
 * @param params - Global model parameters
 * @returns Combined utility score (unbounded, used as input to softmax)
 */
export function computeCandidateScore(
  ward: PrimaryWardData,
  candidate: CandidateProfile,
  params: GlobalParams,
): number {
  // Log-baseline: use log(pollingBaseline/100 + epsilon) to avoid log(0)
  const baselineRatio = candidate.pollingBaseline / 100;
  const logBaseline = Math.log(baselineRatio + 0.001);

  const geoScore = computeGeographicScore(ward, candidate, params.geoWeight);
  const demoScore = computeDemographicScore(ward, candidate, params.demographicWeight);
  const ideoScore = computeIdeologyScore(ward, candidate, params.ideologyWeight);
  const endorseScore = computeEndorsementScore(candidate, params.endorsementWeight);

  return logBaseline + geoScore + demoScore + ideoScore + endorseScore;
}

// ---------------------------------------------------------------------------
// 7. Softmax
// ---------------------------------------------------------------------------

/**
 * Standard softmax with temperature parameter and numerical stability.
 *
 * For an array of raw scores, returns an array of probabilities that sum to 1.0.
 *
 * - Higher temperature -> more uniform distribution (everyone gets closer share)
 * - Lower temperature -> more winner-take-all (highest score dominates)
 * - Temperature = 1.0 is standard softmax
 *
 * Numerical stability: subtracts max(scores) before exponentiation to prevent
 * floating-point overflow.
 *
 * @param scores - Raw utility scores for each candidate
 * @param temperature - Softmax temperature (must be > 0)
 * @returns Array of probabilities in the same order as scores, summing to 1.0
 */
export function softmax(scores: number[], temperature: number): number[] {
  if (scores.length === 0) return [];
  if (scores.length === 1) return [1.0];

  // Clamp temperature to a small positive value to avoid division by zero
  const T = Math.max(0.01, temperature);

  // Numerical stability: subtract max before exp
  const maxScore = Math.max(...scores);
  const scaled = scores.map((s) => (s - maxScore) / T);
  const exps = scaled.map((s) => Math.exp(s));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  // Guard against zero sum (all -Infinity inputs)
  if (sumExps === 0) {
    const uniform = 1 / scores.length;
    return scores.map(() => uniform);
  }

  return exps.map((e) => e / sumExps);
}

// ---------------------------------------------------------------------------
// 8. Turnout Model
// ---------------------------------------------------------------------------

/**
 * Estimates total votes a ward will cast in the Democratic primary.
 *
 * Base: votingAgePopulation * (turnoutRate / 100)
 *
 * Adjustments:
 *  - Urban: x0.85  (slightly lower primary turnout in cities)
 *  - Suburban: x1.0  (baseline)
 *  - Rural: x0.90  (slightly lower in rural areas)
 *  - High partisan lean (> 20, strong D areas): x1.1  (more reliable Dem primary voters)
 *  - Moderate partisan lean (5-20): x1.0  (baseline)
 *  - Low partisan lean (< 5): x0.8  (fewer reliable Dem primary voters)
 *
 * @param ward - Ward data with VAP and classification
 * @param turnoutRate - Percentage of VAP expected to turn out (0-100)
 * @returns Estimated total votes (non-negative integer)
 */
export function computeTurnout(
  ward: PrimaryWardData,
  turnoutRate: number,
): number {
  if (ward.votingAgePopulation <= 0 || turnoutRate <= 0) return 0;

  const baseRate = turnoutRate / 100;

  // Urban/suburban/rural multiplier
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

  // Partisan lean adjustment -- continuous formula: strong partisan areas
  // get a slight turnout boost (up to ~9% at lean 50)
  const absLean = Math.abs(ward.partisanLean);
  const partisanMultiplier = 1 + clamp(absLean - 20, 0, 30) * 0.003;

  const turnout = Math.round(
    ward.votingAgePopulation * baseRate * urbanMultiplier * partisanMultiplier,
  );
  return Math.max(0, turnout);
}

// ---------------------------------------------------------------------------
// 9. Main Prediction Entry Point
// ---------------------------------------------------------------------------

/**
 * Predicts primary election results for all wards.
 *
 * For each ward:
 *  1. Filters to active candidates only
 *  2. Computes a utility score for each active candidate
 *  3. Applies softmax with the configured temperature to get vote shares
 *  4. Uses the turnout model to estimate total votes
 *  5. Multiplies vote shares by total votes to get per-candidate vote counts
 *  6. Determines winner and winning margin
 *
 * Uses the largest-remainder method (Hamilton method) for integer vote
 * allocation to ensure per-ward vote counts sum exactly to total votes.
 *
 * @param wards - Array of ward data with demographics and location
 * @param candidates - Array of all candidate profiles (active and inactive)
 * @param params - Global model parameters
 * @returns Array of per-ward predictions
 */
export function predictPrimary(
  wards: PrimaryWardData[],
  candidates: CandidateProfile[],
  params: GlobalParams,
): RuPrediction[] {
  const activeCandidates = candidates.filter((c) => c.isActive);

  // Edge case: no active candidates
  if (activeCandidates.length === 0) {
    return wards.map((ward) => ({
      ruId: ward.ruId,
      totalVotes: 0,
      candidates: [],
      winnerId: '',
      winnerMargin: 0,
    }));
  }

  // Single candidate -- they win every ward with 100%
  if (activeCandidates.length === 1) {
    const sole = activeCandidates[0];
    return wards.map((ward) => {
      const totalVotes = computeTurnout(ward, params.turnoutRate);
      return {
        ruId: ward.ruId,
        totalVotes,
        candidates: [{
          candidateId: sole.id,
          voteShare: 1.0,
          votes: totalVotes,
        }],
        winnerId: sole.id,
        winnerMargin: 1.0,
      };
    });
  }

  return wards.map((ward) => {
    // Compute raw scores for each active candidate
    const scores = activeCandidates.map((c) =>
      computeCandidateScore(ward, c, params),
    );

    // Convert to vote shares via softmax
    const voteShares = softmax(scores, params.temperature);

    // Estimate total turnout for this ward
    const totalVotes = computeTurnout(ward, params.turnoutRate);

    // Allocate votes to candidates using largest-remainder (Hamilton) method
    // to ensure integer votes sum exactly to totalVotes
    const rawVotes = voteShares.map((share) => share * totalVotes);
    const flooredVotes = rawVotes.map((v) => Math.floor(v));
    let remainder = totalVotes - flooredVotes.reduce((sum, v) => sum + v, 0);

    // Distribute remaining votes to candidates with largest fractional parts
    if (remainder > 0) {
      const remainders = rawVotes.map((v, i) => ({
        index: i,
        frac: v - flooredVotes[i],
      }));
      remainders.sort((x, y) => y.frac - x.frac);
      for (let r = 0; r < remainder && r < remainders.length; r++) {
        flooredVotes[remainders[r].index] += 1;
      }
    }

    // Build candidate vote array
    const candidateVotes: CandidateVote[] = activeCandidates.map((c, i) => ({
      candidateId: c.id,
      voteShare: voteShares[i],
      votes: flooredVotes[i],
    }));

    // Determine winner and margin
    let maxVotes = -1;
    let secondMaxVotes = -1;
    let winnerId = '';

    for (const cv of candidateVotes) {
      if (cv.votes > maxVotes) {
        secondMaxVotes = maxVotes;
        maxVotes = cv.votes;
        winnerId = cv.candidateId;
      } else if (cv.votes > secondMaxVotes) {
        secondMaxVotes = cv.votes;
      }
    }

    // Margin as fraction of total votes (0-1), 0 if no votes cast
    const winnerMargin =
      totalVotes > 0
        ? (maxVotes - Math.max(secondMaxVotes, 0)) / totalVotes
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

// ---------------------------------------------------------------------------
// 10. Statewide Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate ward-level predictions to statewide totals.
 *
 * Sums per-candidate votes across all wards and computes statewide vote shares.
 *
 * @param predictions - Array of per-ward predictions
 * @param candidates - Array of all candidate profiles (active and inactive)
 * @returns Array of per-candidate statewide vote totals
 */
export function aggregateStatewide(
  predictions: RuPrediction[],
  candidates: CandidateProfile[],
): CandidateVote[] {
  const activeCandidates = candidates.filter((c) => c.isActive);
  const totalsMap = new Map<string, number>();
  let grandTotal = 0;

  activeCandidates.forEach((c) => totalsMap.set(c.id, 0));

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    grandTotal += pred.totalVotes;
    for (let j = 0; j < pred.candidates.length; j++) {
      const cv = pred.candidates[j];
      totalsMap.set(cv.candidateId, (totalsMap.get(cv.candidateId) || 0) + cv.votes);
    }
  }

  return activeCandidates.map((c) => {
    const votes = totalsMap.get(c.id) || 0;
    return {
      candidateId: c.id,
      voteShare: grandTotal > 0 ? votes / grandTotal : 0,
      votes,
    };
  });
}
