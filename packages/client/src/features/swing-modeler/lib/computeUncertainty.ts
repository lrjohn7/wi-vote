import type { UncertaintyBand, WardData, Prediction } from '@/types/election';

/**
 * Compute uncertainty bands for ward predictions.
 *
 * Confidence = f(election count, volatility, isEstimate):
 * - More elections analyzed -> higher confidence
 * - Lower std deviation of historical margins -> higher confidence
 * - isEstimate wards -> penalty
 */
export function computeUncertainty(
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

    const relevantElections = ward.elections.filter((e) => e.raceType === baseRaceType);
    const electionCount = relevantElections.length;

    // Volatility
    let volatility = 10;
    if (electionCount >= 2) {
      const margins = relevantElections.map((e) => e.margin);
      const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
      const variance = margins.reduce((a, b) => a + (b - mean) ** 2, 0) / margins.length;
      volatility = Math.sqrt(variance);
    }

    const hasEstimates = relevantElections.some((e) => e.isEstimate);

    // Compute confidence
    let confidence = 0.3;
    confidence += Math.min(0.3, electionCount * 0.05);
    confidence += Math.max(0, 0.3 - volatility * 0.02);
    if (hasEstimates) confidence -= 0.1;
    confidence = Math.max(0.1, Math.min(0.9, confidence));

    const bandWidth = (1 - confidence) * 20;

    return {
      wardId: ward.wardId,
      lowerDemPct: Math.max(0, pred.predictedDemPct - bandWidth),
      upperDemPct: Math.min(100, pred.predictedDemPct + bandWidth),
      lowerMargin: pred.predictedMargin - bandWidth * 2,
      upperMargin: pred.predictedMargin + bandWidth * 2,
    };
  });
}

/**
 * Convert uncertainty bands to a confidence map (wardId -> opacity 0.3-1.0)
 */
export function uncertaintyToOpacityMap(
  uncertainty: UncertaintyBand[],
): Record<string, number> {
  const opacities: Record<string, number> = {};
  for (const band of uncertainty) {
    const range = band.upperDemPct - band.lowerDemPct;
    // Narrower range = higher confidence = higher opacity
    // Range of 0-5 -> opacity 1.0, range of 40 -> opacity 0.3
    const opacity = Math.max(0.3, Math.min(1.0, 1.0 - (range - 5) / 50));
    opacities[band.wardId] = opacity;
  }
  return opacities;
}
