/**
 * primaryAggregations.ts -- Aggregation functions for primary election predictions.
 *
 * Groups ward-level predictions by statewide, county, or region and sums
 * vote totals for each candidate. All functions are pure.
 */

import type {
  CandidateProfile,
  CandidateVote,
  PrimaryWardData,
  RuPrediction,
} from './primaryModel';

// ---------------------------------------------------------------------------
// 10. Statewide Aggregation
// ---------------------------------------------------------------------------

/**
 * Sums all ward-level predictions to statewide totals.
 *
 * Returns an array of CandidateVote sorted by votes descending (winner first).
 *
 * @param predictions - Per-ward predictions from predictPrimary()
 * @param candidates - All candidate profiles (used for candidate IDs)
 * @returns Statewide vote totals per candidate, sorted by votes descending
 */
export function aggregateStatewide(
  predictions: RuPrediction[],
  candidates: CandidateProfile[],
): CandidateVote[] {
  const activeCandidates = candidates.filter((c) => c.isActive);

  if (activeCandidates.length === 0 || predictions.length === 0) {
    return [];
  }

  // Accumulate votes per candidate
  const voteMap = new Map<string, number>();
  for (const c of activeCandidates) {
    voteMap.set(c.id, 0);
  }

  let totalVotes = 0;
  for (const pred of predictions) {
    totalVotes += pred.totalVotes;
    for (const cv of pred.candidates) {
      const current = voteMap.get(cv.candidateId) ?? 0;
      voteMap.set(cv.candidateId, current + cv.votes);
    }
  }

  // Build results array
  const results: CandidateVote[] = [];
  for (const [candidateId, votes] of voteMap) {
    results.push({
      candidateId,
      votes,
      voteShare: totalVotes > 0 ? votes / totalVotes : 0,
    });
  }

  // Sort by votes descending
  results.sort((x, y) => y.votes - x.votes);
  return results;
}

// ---------------------------------------------------------------------------
// 11. County Aggregation
// ---------------------------------------------------------------------------

/**
 * Groups predictions by county and sums vote totals within each county.
 *
 * @param predictions - Per-ward predictions from predictPrimary()
 * @param wards - Ward data array (parallel to predictions, same ordering)
 * @param candidates - All candidate profiles
 * @returns Map from county name to array of CandidateVote (sorted by votes descending)
 */
export function aggregateByCounty(
  predictions: RuPrediction[],
  wards: PrimaryWardData[],
  candidates: CandidateProfile[],
): Record<string, CandidateVote[]> {
  const activeCandidates = candidates.filter((c) => c.isActive);
  if (activeCandidates.length === 0) return {};

  // Build ward-to-county lookup
  const wardCounty = new Map<string, string>();
  for (const ward of wards) {
    wardCounty.set(ward.ruId, ward.county);
  }

  // Accumulate votes per county per candidate
  const countyVotes = new Map<string, Map<string, number>>();
  const countyTotals = new Map<string, number>();

  for (const pred of predictions) {
    const county = wardCounty.get(pred.ruId);
    if (!county) continue;

    if (!countyVotes.has(county)) {
      const candidateMap = new Map<string, number>();
      for (const c of activeCandidates) candidateMap.set(c.id, 0);
      countyVotes.set(county, candidateMap);
      countyTotals.set(county, 0);
    }

    countyTotals.set(county, (countyTotals.get(county) ?? 0) + pred.totalVotes);
    const candidateMap = countyVotes.get(county)!;
    for (const cv of pred.candidates) {
      candidateMap.set(cv.candidateId, (candidateMap.get(cv.candidateId) ?? 0) + cv.votes);
    }
  }

  // Build results
  const result: Record<string, CandidateVote[]> = {};
  for (const [county, candidateMap] of countyVotes) {
    const total = countyTotals.get(county) ?? 0;
    const countyResults: CandidateVote[] = [];
    for (const [candidateId, votes] of candidateMap) {
      countyResults.push({
        candidateId,
        votes,
        voteShare: total > 0 ? votes / total : 0,
      });
    }
    countyResults.sort((x, y) => y.votes - x.votes);
    result[county] = countyResults;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 12. Region Aggregation
// ---------------------------------------------------------------------------

/**
 * Groups predictions by region (MKE metro, Madison metro, Fox Valley, Rural)
 * and sums vote totals within each region.
 *
 * Uses a ward-to-region lookup map that must be provided externally
 * (typically built from regionMapping.ts).
 *
 * @param predictions - Per-ward predictions from predictPrimary()
 * @param wards - Ward data array (parallel to predictions)
 * @param candidates - All candidate profiles
 * @param wardRegions - Map from ruId to region name
 * @returns Map from region name to array of CandidateVote (sorted by votes descending)
 */
export function aggregateByRegion(
  predictions: RuPrediction[],
  _wards: PrimaryWardData[],
  candidates: CandidateProfile[],
  wardRegions: Record<string, string>,
): Record<string, CandidateVote[]> {
  const activeCandidates = candidates.filter((c) => c.isActive);
  if (activeCandidates.length === 0) return {};

  // Get region for a ward, defaulting to rural
  const getRegion = (ruId: string): string => {
    return wardRegions[ruId] ?? 'rural';
  };

  // Accumulate votes per region per candidate
  const regionVotes = new Map<string, Map<string, number>>();
  const regionTotals = new Map<string, number>();

  for (const pred of predictions) {
    const region = getRegion(pred.ruId);

    if (!regionVotes.has(region)) {
      const candidateMap = new Map<string, number>();
      for (const c of activeCandidates) candidateMap.set(c.id, 0);
      regionVotes.set(region, candidateMap);
      regionTotals.set(region, 0);
    }

    regionTotals.set(region, (regionTotals.get(region) ?? 0) + pred.totalVotes);
    const candidateMap = regionVotes.get(region)!;
    for (const cv of pred.candidates) {
      candidateMap.set(cv.candidateId, (candidateMap.get(cv.candidateId) ?? 0) + cv.votes);
    }
  }

  // Build results
  const result: Record<string, CandidateVote[]> = {};
  for (const [region, candidateMap] of regionVotes) {
    const total = regionTotals.get(region) ?? 0;
    const regionResults: CandidateVote[] = [];
    for (const [candidateId, votes] of candidateMap) {
      regionResults.push({
        candidateId,
        votes,
        voteShare: total > 0 ? votes / total : 0,
      });
    }
    regionResults.sort((x, y) => y.votes - x.votes);
    result[region] = regionResults;
  }

  return result;
}
