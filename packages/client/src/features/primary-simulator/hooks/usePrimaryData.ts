import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useBulkDemographics } from '@/shared/hooks/useWardDemographics';
import type { WardMapEntry } from '@/features/election-map/hooks/useMapData';

/**
 * Ward-level data assembled for the primary election model.
 * Combines centroids, demographics, and partisan lean from recent elections.
 */
export interface PrimaryWardData {
  wardId: string;
  county: string;
  municipality: string;
  centroidLng: number;
  centroidLat: number;
  partisanLean: number; // positive = D, negative = R
  totalVotes2024: number;
  demographics: {
    urbanRuralClass: 'urban' | 'suburban' | 'rural';
    populationDensity: number;
    blackPct: number;
    hispanicPct: number;
    collegDegreePct: number;
    medianHouseholdIncome: number;
    whitePct: number;
  } | null;
}

/**
 * Computes the centroid of a GeoJSON geometry.
 * For MultiPolygon/Polygon, averages all coordinate positions.
 * Returns [lng, lat].
 */
function computeCentroid(geometry: GeoJSON.Geometry): [number, number] {
  const coords: number[][] = [];

  function collectCoords(c: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][]): void {
    if (typeof c[0] === 'number') {
      coords.push(c as number[]);
      return;
    }
    for (const item of c as (GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][])[]) {
      collectCoords(item);
    }
  }

  if ('coordinates' in geometry) {
    collectCoords(geometry.coordinates as GeoJSON.Position[]);
  }

  if (coords.length === 0) return [-89.5, 43.0]; // Wisconsin center fallback

  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}

/**
 * Fetches and assembles the ward-level data needed by the primary model.
 * Combines ward boundary centroids, demographics, and partisan lean.
 */
export function usePrimaryData() {
  // 1. Get ward boundaries (for centroids and metadata)
  const { data: boundaries, isLoading: boundariesLoading } = useQuery({
    queryKey: queryKeys.wards.boundaries(2022),
    queryFn: () => api.getWardBoundaries(2022),
    staleTime: 30 * 60 * 1000, // 30 minutes -- boundaries are static
  });

  // 2. Get bulk demographics
  const { data: demographics, isLoading: demosLoading } = useBulkDemographics(true);

  // 3. Get 2024 presidential data for partisan lean calculation
  const { data: electionData, isLoading: electionLoading } = useQuery({
    queryKey: queryKeys.elections.mapData(2024, 'president'),
    queryFn: () => api.getMapData(2024, 'president'),
    staleTime: 30 * 60 * 1000,
  });

  // 4. Assemble PrimaryWardData[] from the three sources
  const wardData = useMemo(() => {
    if (!boundaries || !electionData) return null;

    const electionMap: Record<string, WardMapEntry> = electionData.data;
    const result: PrimaryWardData[] = [];

    for (const feature of boundaries.features) {
      const props = feature.properties;
      if (!props) continue;

      const wardId = String(props.ward_id ?? feature.id ?? '');
      if (!wardId) continue;

      // Compute centroid from geometry
      const [centroidLng, centroidLat] = feature.geometry
        ? computeCentroid(feature.geometry)
        : [-89.5, 43.0];

      // Get partisan lean from election data
      const election = electionMap[wardId];
      const partisanLean = election ? election.margin : 0;
      const totalVotes = election ? election.totalVotes : 0;

      // Get demographics
      const demo = demographics?.[wardId];
      const demoData: PrimaryWardData['demographics'] = demo
        ? {
            urbanRuralClass: demo.urbanRuralClass,
            populationDensity: demo.populationDensity,
            blackPct: demo.blackPct,
            hispanicPct: demo.hispanicPct,
            collegDegreePct: demo.collegDegreePct,
            medianHouseholdIncome: demo.medianHouseholdIncome,
            whitePct: demo.whitePct,
          }
        : null;

      result.push({
        wardId,
        county: String(props.county ?? ''),
        municipality: String(props.municipality ?? ''),
        centroidLng,
        centroidLat,
        partisanLean,
        totalVotes2024: totalVotes,
        demographics: demoData,
      });
    }

    return result;
  }, [boundaries, electionData, demographics]);

  return {
    wardData,
    isLoading: boundariesLoading || demosLoading || electionLoading,
  };
}
