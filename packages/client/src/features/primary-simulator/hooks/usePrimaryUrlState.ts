import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { usePrimaryStore } from '@/stores/primaryStore';
import type { PrimaryGlobalParams, PrimaryMapMode } from '@/stores/primaryStore';
import type { PrimaryPoll, PollPopulation } from '@/types/primary';
import { DEFAULT_AVERAGING_CONFIG } from '../lib/pollAveraging';

/** Candidate IDs used for URL param encoding */
const CANDIDATE_IDS = [
  'barnes', 'crowley', 'rodriguez', 'hong',
  'roys', 'hughes', 'brennan', 'mcguire',
] as const;

const VALID_MAP_MODES: PrimaryMapMode[] = ['winner', 'candidate-heatmap'];
const VALID_POPULATIONS: PollPopulation[] = ['lv', 'rv', 'a'];

/**
 * Bidirectional URL <-> primary store synchronization.
 *
 * On mount: reads URL params and initializes the store.
 * On store change: writes store state back to URL params.
 *
 * --- Poll Average mode (src=avg) ---
 *   src        - 'avg' when poll averaging is active
 *   polls_off  - comma-separated IDs of disabled built-in polls
 *   cpoll_N    - custom poll encoded as pipe-delimited string:
 *                pollster|endDate|sampleSize|population|rating|partisan|cand1:pct1,cand2:pct2,...|undecided
 *   hl         - half-life days (if non-default)
 *   freq       - '0' if frequency dampening is off (default on)
 *   partisan   - '0' if partisan penalty is off (default on)
 *
 * --- Scenario mode (default when no src=avg) ---
 *   preset     - active scenario preset ID
 *   poll_X     - per-candidate polling baseline (e.g. poll_barnes=10)
 *
 * --- Shared params ---
 *   mode       - map mode (winner | heatmap)
 *   heatmap    - heatmap candidate ID
 *   turnout    - turnout rate
 *   temp       - temperature
 *   geo_w      - geographic weight
 *   ideo_w     - ideology weight
 *   demo_w     - demographic weight
 *   endorse_w  - endorsement weight
 *   dropout    - comma-separated inactive candidate IDs
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
  const pollSource = usePrimaryStore((s) => s.pollSource);
  const polls = usePrimaryStore((s) => s.polls);
  const pollAveragingConfig = usePrimaryStore((s) => s.pollAveragingConfig);

  // Store actions
  const setCandidateParam = usePrimaryStore((s) => s.setCandidateParam);
  const toggleCandidateActive = usePrimaryStore((s) => s.toggleCandidateActive);
  const setGlobalParam = usePrimaryStore((s) => s.setGlobalParam);
  const setActivePresetId = usePrimaryStore((s) => s.setActivePresetId);
  const setMapMode = usePrimaryStore((s) => s.setMapMode);
  const setHeatmapCandidate = usePrimaryStore((s) => s.setHeatmapCandidate);
  const setPollSource = usePrimaryStore((s) => s.setPollSource);
  const togglePollEnabled = usePrimaryStore((s) => s.togglePollEnabled);
  const addPoll = usePrimaryStore((s) => s.addPoll);
  const setPollAveragingConfig = usePrimaryStore((s) => s.setPollAveragingConfig);

  // Read URL params on mount -> initialize store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Determine poll source mode
    const src = searchParams.get('src');
    const isAvgMode = src === 'avg';
    const hasPreset = searchParams.has('preset');

    if (isAvgMode) {
      setPollSource('average');
    } else if (hasPreset) {
      setPollSource('scenario');
    }
    // Default: leave as store default ('average')

    // --- Poll average mode params ---
    if (isAvgMode) {
      // Disabled built-in polls
      const pollsOff = searchParams.get('polls_off');
      if (pollsOff) {
        const disabledIds = pollsOff.split(',').filter(Boolean);
        for (const id of disabledIds) {
          const poll = usePrimaryStore.getState().polls.find((p) => p.id === id && p.isEnabled);
          if (poll) togglePollEnabled(id);
        }
      }

      // Custom polls: cpoll_0, cpoll_1, etc.
      let cpollIdx = 0;
      while (true) {
        const raw = searchParams.get('cpoll_' + cpollIdx);
        if (!raw) break;
        const decoded = decodeCustomPoll(raw);
        if (decoded) addPoll(decoded);
        cpollIdx++;
      }

      // Averaging config overrides
      const hl = searchParams.get('hl');
      if (hl) {
        const val = parseInt(hl);
        if (!isNaN(val) && val >= 5 && val <= 60) {
          setPollAveragingConfig({ halfLifeDays: val });
        }
      }
      const freq = searchParams.get('freq');
      if (freq === '0') {
        setPollAveragingConfig({ frequencyDampening: false });
      }
      const partisanParam = searchParams.get('partisan');
      if (partisanParam === '0') {
        setPollAveragingConfig({ partisanPenalty: false });
      }
    }

    // --- Scenario mode params ---
    if (hasPreset) {
      const preset = searchParams.get('preset');
      if (preset) setActivePresetId(preset);
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

    // Per-candidate polling baselines (scenario mode)
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

    // Poll source mode
    if (pollSource === 'average') {
      params.set('src', 'avg');

      // Disabled built-in polls
      const disabledBuiltIn = polls
        .filter((p) => p.isBuiltIn && !p.isEnabled)
        .map((p) => p.id);
      if (disabledBuiltIn.length > 0) {
        params.set('polls_off', disabledBuiltIn.join(','));
      }

      // Custom polls
      const customPolls = polls.filter((p) => !p.isBuiltIn);
      customPolls.forEach((p, idx) => {
        params.set('cpoll_' + idx, encodeCustomPoll(p));
      });

      // Averaging config (only non-defaults)
      if (pollAveragingConfig.halfLifeDays !== DEFAULT_AVERAGING_CONFIG.halfLifeDays) {
        params.set('hl', String(pollAveragingConfig.halfLifeDays));
      }
      if (!pollAveragingConfig.frequencyDampening) {
        params.set('freq', '0');
      }
      if (!pollAveragingConfig.partisanPenalty) {
        params.set('partisan', '0');
      }
    } else {
      // Scenario mode
      if (activePresetId && activePresetId !== 'custom') {
        params.set('preset', activePresetId);
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

    // Dropout candidates
    const droppedOut = candidates.filter((c) => !c.isActive).map((c) => c.id);
    if (droppedOut.length > 0) {
      params.set('dropout', droppedOut.join(','));
    }

    setSearchParams(params, { replace: true });
  }, [candidates, globalParams, activePresetId, mapMode, heatmapCandidateId, pollSource, polls, pollAveragingConfig, setSearchParams]);
}

// -- Compact pipe-delimited encoding for custom polls in URL --

/**
 * Encode a custom PrimaryPoll to a compact pipe-delimited string for URL params.
 *
 * Format: pollster|endDate|sampleSize|population|rating|partisan|cand1:pct1,cand2:pct2,...|undecided
 */
function encodeCustomPoll(poll: PrimaryPoll): string {
  const candidateParts = Object.entries(poll.candidates)
    .filter(([, pct]) => pct > 0)
    .map(([id, pct]) => `${id}:${pct}`)
    .join(',');

  return [
    encodeURIComponent(poll.pollster),
    poll.endDate,
    poll.sampleSize,
    poll.population,
    poll.pollsterRating.toFixed(1),
    poll.isPartisan ? '1' : '0',
    candidateParts,
    poll.undecided,
  ].join('|');
}

/**
 * Decode a pipe-delimited custom poll string back to a PrimaryPoll.
 */
function decodeCustomPoll(raw: string): PrimaryPoll | null {
  try {
    const parts = raw.split('|');
    if (parts.length < 8) return null;

    const pollster = decodeURIComponent(parts[0]);
    const endDate = parts[1];
    const sampleSize = parseInt(parts[2]);
    const population = VALID_POPULATIONS.includes(parts[3] as PollPopulation)
      ? (parts[3] as PollPopulation)
      : 'lv';
    const rating = parseFloat(parts[4]);
    const isPartisan = parts[5] === '1';
    const undecided = parseFloat(parts[7]);

    // Parse candidate percentages
    const candidateEntries = parts[6].split(',').filter(Boolean);
    const candidates: Record<string, number> = {};
    for (const entry of candidateEntries) {
      const [id, pctStr] = entry.split(':');
      if (id && pctStr) {
        candidates[id] = parseFloat(pctStr);
      }
    }

    if (!pollster || !endDate || isNaN(sampleSize) || isNaN(rating)) return null;

    return {
      id: crypto.randomUUID(),
      pollster,
      startDate: endDate, // approximate start = end for URL-decoded polls
      endDate,
      sampleSize,
      population,
      methodology: '',
      pollsterRating: rating,
      isPartisan,
      marginOfError: null,
      sourceUrl: '',
      notes: 'Loaded from shared URL',
      candidates,
      undecided: isNaN(undecided) ? 0 : undecided,
      isEnabled: true,
      isBuiltIn: false,
    };
  } catch {
    return null;
  }
}
