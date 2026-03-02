import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { usePrimaryStore } from '@/stores/primaryStore';
import type { PrimaryGlobalParams, PrimaryMapMode } from '@/stores/primaryStore';

/** Candidate IDs used for URL param encoding */
const CANDIDATE_IDS = [
  'barnes', 'crowley', 'rodriguez', 'hong',
  'roys', 'hughes', 'brennan', 'mcguire',
] as const;

const VALID_MAP_MODES: PrimaryMapMode[] = ['winner', 'candidate-heatmap'];

/**
 * Bidirectional URL <-> primary store synchronization.
 *
 * On mount: reads URL params and initializes the store.
 * On store change: writes store state back to URL params.
 *
 * URL params:
 *   preset    - active poll preset ID
 *   mode      - map mode (winner | heatmap)
 *   heatmap   - heatmap candidate ID
 *   turnout   - turnout rate
 *   temp      - temperature
 *   geo_w     - geographic weight
 *   ideo_w    - ideology weight
 *   demo_w    - demographic weight
 *   endorse_w - endorsement weight
 *   poll_X    - per-candidate polling baseline (e.g. poll_barnes=10)
 *   dropout   - comma-separated inactive candidate IDs (e.g. dropout=brennan,mcguire)
 */
export function usePrimaryUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // Store selectors
  const candidates = usePrimaryStore((s) => s.candidates);
  const globalParams = usePrimaryStore((s) => s.globalParams);
  const activePresetId = usePrimaryStore((s) => s.activePresetId);
  const mapMode = usePrimaryStore((s) => s.mapMode);
  const heatmapCandidateId = usePrimaryStore((s) => s.heatmapCandidateId);

  // Store actions
  const setCandidateParam = usePrimaryStore((s) => s.setCandidateParam);
  const toggleCandidateActive = usePrimaryStore((s) => s.toggleCandidateActive);
  const setGlobalParam = usePrimaryStore((s) => s.setGlobalParam);
  const setActivePresetId = usePrimaryStore((s) => s.setActivePresetId);
  const setMapMode = usePrimaryStore((s) => s.setMapMode);
  const setHeatmapCandidate = usePrimaryStore((s) => s.setHeatmapCandidate);

  // Read URL params on mount -> initialize store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Preset
    const preset = searchParams.get('preset');
    if (preset) {
      setActivePresetId(preset);
    }

    // Map mode
    const mode = searchParams.get('mode');
    if (mode && VALID_MAP_MODES.includes(mode as PrimaryMapMode)) {
      setMapMode(mode as PrimaryMapMode);
    }

    // Heatmap candidate
    const heatmap = searchParams.get('heatmap');
    if (heatmap && CANDIDATE_IDS.includes(heatmap as typeof CANDIDATE_IDS[number])) {
      setHeatmapCandidate(heatmap);
    }

    // Global params
    const globalParamMap: { urlKey: string; paramKey: keyof PrimaryGlobalParams }[] = [
      { urlKey: 'turnout', paramKey: 'turnoutRate' },
      { urlKey: 'temp', paramKey: 'temperature' },
      { urlKey: 'geo_w', paramKey: 'geoWeight' },
      { urlKey: 'ideo_w', paramKey: 'ideologyWeight' },
      { urlKey: 'demo_w', paramKey: 'demographicWeight' },
      { urlKey: 'endorse_w', paramKey: 'endorsementWeight' },
    ];

    for (const { urlKey, paramKey } of globalParamMap) {
      const raw = searchParams.get(urlKey);
      if (raw != null && raw !== '') {
        const val = parseFloat(raw);
        if (!isNaN(val)) setGlobalParam(paramKey, val);
      }
    }

    // Per-candidate polling baselines
    for (const cid of CANDIDATE_IDS) {
      const raw = searchParams.get('poll_' + cid);
      if (raw != null && raw !== '') {
        const val = parseFloat(raw);
        if (!isNaN(val)) setCandidateParam(cid, 'pollingBaseline', val);
      }
    }

    // Dropout candidates
    const dropout = searchParams.get('dropout');
    if (dropout) {
      const droppedIds = dropout.split(',').filter((id) => CANDIDATE_IDS.includes(id as typeof CANDIDATE_IDS[number]));
      for (const cid of droppedIds) {
        // Only toggle if currently active (default is active)
        const candidate = usePrimaryStore.getState().candidates.find((c) => c.id === cid);
        if (candidate && candidate.isActive) {
          toggleCandidateActive(cid);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write store state to URL params on change
  useEffect(() => {
    if (!initialized.current) return;

    const params = new URLSearchParams();

    // Preset
    if (activePresetId && activePresetId !== 'custom') {
      params.set('preset', activePresetId);
    }

    // Map mode
    if (mapMode !== 'winner') {
      params.set('mode', mapMode);
    }

    // Heatmap candidate
    if (heatmapCandidateId) {
      params.set('heatmap', heatmapCandidateId);
    }

    // Global params (only if non-default)
    const globalDefaults: PrimaryGlobalParams = {
      turnoutRate: 22,
      temperature: 1.0,
      geoWeight: 1.0,
      ideologyWeight: 0.5,
      demographicWeight: 0.8,
      endorsementWeight: 0.3,
    };

    const globalParamMap: { urlKey: string; paramKey: keyof PrimaryGlobalParams }[] = [
      { urlKey: 'turnout', paramKey: 'turnoutRate' },
      { urlKey: 'temp', paramKey: 'temperature' },
      { urlKey: 'geo_w', paramKey: 'geoWeight' },
      { urlKey: 'ideo_w', paramKey: 'ideologyWeight' },
      { urlKey: 'demo_w', paramKey: 'demographicWeight' },
      { urlKey: 'endorse_w', paramKey: 'endorsementWeight' },
    ];

    for (const { urlKey, paramKey } of globalParamMap) {
      const val = globalParams[paramKey];
      if (val !== globalDefaults[paramKey]) {
        params.set(urlKey, String(val));
      }
    }

    // Per-candidate polling baselines (only if non-default)
    const defaultPolling: Record<string, number> = {
      barnes: 10, crowley: 5, rodriguez: 6, hong: 11,
      roys: 4, hughes: 3, brennan: 3, mcguire: 2,
    };

    for (const candidate of candidates) {
      if (candidate.pollingBaseline !== (defaultPolling[candidate.id] ?? 0)) {
        params.set('poll_' + candidate.id, String(candidate.pollingBaseline));
      }
    }

    // Dropout candidates
    const droppedOut = candidates.filter((c) => !c.isActive).map((c) => c.id);
    if (droppedOut.length > 0) {
      params.set('dropout', droppedOut.join(','));
    }

    setSearchParams(params, { replace: true });
  }, [candidates, globalParams, activePresetId, mapMode, heatmapCandidateId, setSearchParams]);
}
