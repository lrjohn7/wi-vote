import { useMemo } from 'react';
import { useMapData } from '@/features/election-map/hooks/useMapData';
import type { RaceType } from '@/types/election';

export interface DiffEntry {
  diffMargin: number;
  marginA: number;
  marginB: number;
  demPctA: number;
  demPctB: number;
}

export interface DiffMapData {
  wardCount: number;
  data: Record<string, DiffEntry>;
  avgDiff: number;
  maxShiftD: number;
  maxShiftR: number;
}

export function useComparisonData(
  yearA: number | null,
  raceA: RaceType | null,
  yearB: number | null,
  raceB: RaceType | null,
) {
  const queryA = useMapData(yearA, raceA);
  const queryB = useMapData(yearB, raceB);

  const diffData = useMemo((): DiffMapData | null => {
    if (!queryA.data || !queryB.data) return null;

    const dataA = queryA.data.data;
    const dataB = queryB.data.data;
    const allWardIds = new Set([...Object.keys(dataA), ...Object.keys(dataB)]);

    const diff: Record<string, DiffEntry> = {};
    let totalDiff = 0;
    let count = 0;
    let maxShiftD = 0;
    let maxShiftR = 0;

    for (const wardId of allWardIds) {
      const a = dataA[wardId];
      const b = dataB[wardId];
      if (!a || !b) continue;

      const diffMargin = a.margin - b.margin; // positive = shifted D vs election B
      diff[wardId] = {
        diffMargin,
        marginA: a.margin,
        marginB: b.margin,
        demPctA: a.demPct,
        demPctB: b.demPct,
      };

      totalDiff += diffMargin;
      count++;
      if (diffMargin > maxShiftD) maxShiftD = diffMargin;
      if (diffMargin < maxShiftR) maxShiftR = diffMargin;
    }

    return {
      wardCount: count,
      data: diff,
      avgDiff: count > 0 ? totalDiff / count : 0,
      maxShiftD,
      maxShiftR,
    };
  }, [queryA.data, queryB.data]);

  return {
    mapDataA: queryA.data ?? null,
    mapDataB: queryB.data ?? null,
    diffData,
    isLoading: queryA.isLoading || queryB.isLoading,
    isError: queryA.isError || queryB.isError,
    error: (queryA.error ?? queryB.error) as Error | null,
  };
}
