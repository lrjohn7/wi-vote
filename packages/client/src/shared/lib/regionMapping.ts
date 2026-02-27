import type { WardMeta } from './wardMetadata';

export type Region = 'milwaukee_metro' | 'madison_metro' | 'fox_valley' | 'rural';

export const REGION_LABELS: Record<Region, string> = {
  milwaukee_metro: 'Milwaukee Metro',
  madison_metro: 'Madison Metro',
  fox_valley: 'Fox Valley',
  rural: 'Rural',
};

const MILWAUKEE_METRO_COUNTIES = new Set([
  'MILWAUKEE', 'WAUKESHA', 'OZAUKEE', 'WASHINGTON',
]);

const MADISON_METRO_COUNTIES = new Set(['DANE']);

const FOX_VALLEY_COUNTIES = new Set([
  'BROWN', 'OUTAGAMIE', 'WINNEBAGO', 'CALUMET',
]);

export function getRegionForCounty(county: string): Region {
  const upper = county.toUpperCase();
  if (MILWAUKEE_METRO_COUNTIES.has(upper)) return 'milwaukee_metro';
  if (MADISON_METRO_COUNTIES.has(upper)) return 'madison_metro';
  if (FOX_VALLEY_COUNTIES.has(upper)) return 'fox_valley';
  return 'rural';
}

export function buildWardRegionMap(
  wardMetadata: Record<string, WardMeta>,
): Record<string, string> {
  const regionMap: Record<string, string> = {};
  for (const [wardId, meta] of Object.entries(wardMetadata)) {
    regionMap[wardId] = getRegionForCounty(meta.county);
  }
  return regionMap;
}
