import { get, set } from 'idb-keyval';

const WARD_BOUNDARIES_KEY = 'wivote:ward-boundaries';
const CACHE_VERSION_KEY = 'wivote:cache-version';
const CURRENT_VERSION = 1;

/**
 * Cache ward boundaries GeoJSON in IndexedDB.
 * Ward boundaries change very rarely, so aggressive caching is safe.
 */
export async function getCachedBoundaries(): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const version = await get(CACHE_VERSION_KEY);
    if (version !== CURRENT_VERSION) return null;
    const data = await get(WARD_BOUNDARIES_KEY);
    return data as GeoJSON.FeatureCollection | null;
  } catch {
    return null;
  }
}

export async function setCachedBoundaries(data: GeoJSON.FeatureCollection): Promise<void> {
  try {
    await set(WARD_BOUNDARIES_KEY, data);
    await set(CACHE_VERSION_KEY, CURRENT_VERSION);
  } catch {
    // IndexedDB may be unavailable (private browsing, etc.)
  }
}

/**
 * Generic IDB cache for election map data.
 */
export async function getCachedMapData(key: string): Promise<unknown | null> {
  try {
    return await get(`wivote:map:${key}`);
  } catch {
    return null;
  }
}

export async function setCachedMapData(key: string, data: unknown): Promise<void> {
  try {
    await set(`wivote:map:${key}`, data);
  } catch {
    // Silently fail
  }
}
