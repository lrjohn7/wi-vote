import type { Prediction } from '@/types/election';
import type { WardMeta } from '@/shared/lib/wardMetadata';

export interface AggregatedResult {
  key: string;
  label: string;
  demVotes: number;
  repVotes: number;
  totalVotes: number;
  margin: number;
  demPct: number;
  winner: 'DEM' | 'REP' | 'TIE';
  wardCount: number;
}

function aggregate(
  predictions: Prediction[],
  wardMetadata: Record<string, WardMeta>,
  groupFn: (wardId: string, meta: WardMeta) => string | null,
  labelFn: (key: string) => string,
): AggregatedResult[] {
  const groups = new Map<string, { dem: number; rep: number; total: number; count: number }>();

  for (const p of predictions) {
    const meta = wardMetadata[p.wardId];
    if (!meta) continue;

    const key = groupFn(p.wardId, meta);
    if (!key) continue;

    const group = groups.get(key) ?? { dem: 0, rep: 0, total: 0, count: 0 };
    group.dem += p.predictedDemVotes;
    group.rep += p.predictedRepVotes;
    group.total += p.predictedTotalVotes;
    group.count += 1;
    groups.set(key, group);
  }

  const results: AggregatedResult[] = [];
  for (const [key, g] of groups) {
    const margin = g.total > 0 ? ((g.dem - g.rep) / g.total) * 100 : 0;
    const demPct = g.total > 0 ? (g.dem / g.total) * 100 : 50;
    results.push({
      key,
      label: labelFn(key),
      demVotes: g.dem,
      repVotes: g.rep,
      totalVotes: g.total,
      margin,
      demPct,
      winner: margin > 0 ? 'DEM' : margin < 0 ? 'REP' : 'TIE',
      wardCount: g.count,
    });
  }

  return results.sort((a, b) => b.margin - a.margin);
}

export function aggregateByCounty(
  predictions: Prediction[],
  wardMetadata: Record<string, WardMeta>,
): AggregatedResult[] {
  return aggregate(
    predictions,
    wardMetadata,
    (_id, meta) => meta.county || null,
    (key) => key,
  );
}

export function aggregateByCongressionalDistrict(
  predictions: Prediction[],
  wardMetadata: Record<string, WardMeta>,
): AggregatedResult[] {
  return aggregate(
    predictions,
    wardMetadata,
    (_id, meta) => meta.congressionalDistrict || null,
    (key) => `CD-${key}`,
  );
}

export function aggregateBySenateDistrict(
  predictions: Prediction[],
  wardMetadata: Record<string, WardMeta>,
): AggregatedResult[] {
  return aggregate(
    predictions,
    wardMetadata,
    (_id, meta) => meta.stateSenateDistrict || null,
    (key) => `SD-${key}`,
  );
}

export function aggregateByAssemblyDistrict(
  predictions: Prediction[],
  wardMetadata: Record<string, WardMeta>,
): AggregatedResult[] {
  return aggregate(
    predictions,
    wardMetadata,
    (_id, meta) => meta.assemblyDistrict || null,
    (key) => `AD-${key}`,
  );
}
