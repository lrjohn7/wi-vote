import { create } from 'zustand';
import type { PrimaryPoll, PollAveragingConfig } from '@/types/primary';
import { computePollingAverage, DEFAULT_AVERAGING_CONFIG } from '@/features/primary-simulator/lib/pollAveraging';
import { BUILT_IN_POLLS } from '@/features/primary-simulator/lib/builtInPolls';

// -- Candidate state --

export interface PrimaryCandidateState {
  id: string;
  name: string;
  shortName: string;
  color: string;
  pollingBaseline: number;
  geographicBase: string;
  geographicBaseCoords: [number, number];
  geographicRadius: number;
  ideologyScore: number;
  affinityBlack: number;
  affinityHispanic: number;
  affinityCollege: number;
  affinityWorkingClass: number;
  affinityUrban: number;
  affinitySuburban: number;
  affinityRural: number;
  endorsementStrength: number;
  isActive: boolean;
}

// -- Global model parameters --

export interface PrimaryGlobalParams {
  turnoutRate: number;
  temperature: number;
  geoWeight: number;
  ideologyWeight: number;
  demographicWeight: number;
  endorsementWeight: number;
}

// -- Prediction results --

export interface PrimaryCandidateVote {
  candidateId: string;
  voteShare: number;
  votes: number;
}

export interface PrimaryRuPrediction {
  ruId: string;
  totalVotes: number;
  candidates: PrimaryCandidateVote[];
  winnerId: string;
  winnerMargin: number;
}

export interface PrimaryMonteCarloResult {
  candidateId: string;
  winProbability: number;
  medianVoteShare: number;
  p10VoteShare: number;
  p90VoteShare: number;
  medianVotes: number;
}

// -- Map display mode --

export type PrimaryMapMode = 'winner' | 'candidate-heatmap';

// -- Poll source mode --

/** Whether candidate baselines come from the multi-poll average or a hypothetical scenario. */
export type PollSourceMode = 'average' | 'scenario';

// -- Default candidate profiles --

const DEFAULT_CANDIDATES: PrimaryCandidateState[] = [
  {
    id: 'barnes',
    name: 'Mandela Barnes',
    shortName: 'Barnes',
    color: '#1e3a5f',
    pollingBaseline: 12.5,
    geographicBase: 'Milwaukee',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 30,
    ideologyScore: 4,
    affinityBlack: 0.8,
    affinityHispanic: 0.4,
    affinityCollege: 0.5,
    affinityWorkingClass: 0.6,
    affinityUrban: 0.8,
    affinitySuburban: 0.3,
    affinityRural: 0.1,
    endorsementStrength: 0.6,
    isActive: true,
  },
  {
    id: 'crowley',
    name: 'David Crowley',
    shortName: 'Crowley',
    color: '#0d9488',
    pollingBaseline: 12.5,
    geographicBase: 'Milwaukee',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 25,
    ideologyScore: 5,
    affinityBlack: 0.6,
    affinityHispanic: 0.3,
    affinityCollege: 0.5,
    affinityWorkingClass: 0.5,
    affinityUrban: 0.7,
    affinitySuburban: 0.4,
    affinityRural: 0.1,
    endorsementStrength: 0.4,
    isActive: true,
  },
  {
    id: 'rodriguez',
    name: 'Sara Rodriguez',
    shortName: 'Rodriguez',
    color: '#7c3aed',
    pollingBaseline: 12.5,
    geographicBase: 'Milwaukee Suburbs',
    geographicBaseCoords: [-88.0070, 42.9592],
    geographicRadius: 35,
    ideologyScore: 6,
    affinityBlack: 0.2,
    affinityHispanic: 0.7,
    affinityCollege: 0.6,
    affinityWorkingClass: 0.3,
    affinityUrban: 0.3,
    affinitySuburban: 0.7,
    affinityRural: 0.3,
    endorsementStrength: 0.3,
    isActive: true,
  },
  {
    id: 'hong',
    name: 'Francesca Hong',
    shortName: 'Hong',
    color: '#16a34a',
    pollingBaseline: 12.5,
    geographicBase: 'Madison',
    geographicBaseCoords: [-89.4012, 43.0731],
    geographicRadius: 30,
    ideologyScore: 2,
    affinityBlack: 0.3,
    affinityHispanic: 0.4,
    affinityCollege: 0.8,
    affinityWorkingClass: 0.3,
    affinityUrban: 0.7,
    affinitySuburban: 0.5,
    affinityRural: 0.2,
    endorsementStrength: 0.5,
    isActive: true,
  },
  {
    id: 'roys',
    name: 'Kelda Roys',
    shortName: 'Roys',
    color: '#e11d48',
    pollingBaseline: 12.5,
    geographicBase: 'Madison',
    geographicBaseCoords: [-89.4012, 43.0731],
    geographicRadius: 25,
    ideologyScore: 3,
    affinityBlack: 0.2,
    affinityHispanic: 0.3,
    affinityCollege: 0.7,
    affinityWorkingClass: 0.4,
    affinityUrban: 0.6,
    affinitySuburban: 0.5,
    affinityRural: 0.3,
    endorsementStrength: 0.4,
    isActive: true,
  },
  {
    id: 'hughes',
    name: 'Missy Hughes',
    shortName: 'Hughes',
    color: '#d97706',
    pollingBaseline: 12.5,
    geographicBase: 'SW Rural',
    geographicBaseCoords: [-90.5, 43.0],
    geographicRadius: 50,
    ideologyScore: 6,
    affinityBlack: 0.1,
    affinityHispanic: 0.2,
    affinityCollege: 0.3,
    affinityWorkingClass: 0.7,
    affinityUrban: 0.1,
    affinitySuburban: 0.3,
    affinityRural: 0.8,
    endorsementStrength: 0.2,
    isActive: true,
  },
  {
    id: 'brennan',
    name: 'Joel Brennan',
    shortName: 'Brennan',
    color: '#475569',
    pollingBaseline: 12.5,
    geographicBase: 'Milwaukee',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 25,
    ideologyScore: 6,
    affinityBlack: 0.3,
    affinityHispanic: 0.3,
    affinityCollege: 0.4,
    affinityWorkingClass: 0.5,
    affinityUrban: 0.6,
    affinitySuburban: 0.4,
    affinityRural: 0.2,
    endorsementStrength: 0.2,
    isActive: true,
  },
  {
    id: 'mcguire',
    name: 'Tip McGuire',
    shortName: 'McGuire',
    color: '#ea580c',
    pollingBaseline: 12.5,
    geographicBase: 'Kenosha',
    geographicBaseCoords: [-87.8212, 42.5847],
    geographicRadius: 30,
    ideologyScore: 5,
    affinityBlack: 0.2,
    affinityHispanic: 0.3,
    affinityCollege: 0.5,
    affinityWorkingClass: 0.5,
    affinityUrban: 0.4,
    affinitySuburban: 0.5,
    affinityRural: 0.3,
    endorsementStrength: 0.2,
    isActive: true,
  },
];

const DEFAULT_GLOBAL_PARAMS: PrimaryGlobalParams = {
  turnoutRate: 22,
  temperature: 1.0,
  geoWeight: 1.0,
  ideologyWeight: 0.5,
  demographicWeight: 0.8,
  endorsementWeight: 0.3,
};

// -- Store interface --

interface PrimaryState {
  // Candidates (mutable parameters)
  candidates: PrimaryCandidateState[];

  // Global model parameters
  globalParams: PrimaryGlobalParams;

  // Selected scenario preset ID (or 'custom' for manual)
  activePresetId: string;

  // Map display
  mapMode: PrimaryMapMode;
  heatmapCandidateId: string | null;

  // Model results
  predictions: PrimaryRuPrediction[] | null;
  statewideTotals: PrimaryCandidateVote[] | null;
  monteCarlo: PrimaryMonteCarloResult[] | null;
  isComputing: boolean;

  // Poll averaging system
  polls: PrimaryPoll[];
  pollAveragingConfig: PollAveragingConfig;
  pollSource: PollSourceMode;

  // Actions — candidates
  setCandidates: (candidates: PrimaryCandidateState[]) => void;
  setCandidateParam: (candidateId: string, param: string, value: number | boolean | string) => void;
  toggleCandidateActive: (candidateId: string) => void;

  // Actions — global params
  setGlobalParam: (param: keyof PrimaryGlobalParams, value: number) => void;
  setGlobalParams: (params: Partial<PrimaryGlobalParams>) => void;

  // Actions — scenario presets
  setActivePresetId: (id: string) => void;
  applyPreset: (candidateBaselines: Record<string, number>) => void;

  // Actions — map
  setMapMode: (mode: PrimaryMapMode) => void;
  setHeatmapCandidate: (candidateId: string | null) => void;

  // Actions — model results
  setPredictions: (predictions: PrimaryRuPrediction[] | null) => void;
  setStatewideTotals: (totals: PrimaryCandidateVote[] | null) => void;
  setMonteCarlo: (mc: PrimaryMonteCarloResult[] | null) => void;
  setIsComputing: (computing: boolean) => void;

  // Actions — poll averaging
  addPoll: (poll: PrimaryPoll) => void;
  removePoll: (pollId: string) => void;
  togglePollEnabled: (pollId: string) => void;
  updatePoll: (pollId: string, updates: Partial<PrimaryPoll>) => void;
  setPollAveragingConfig: (config: Partial<PollAveragingConfig>) => void;
  setPollSource: (source: PollSourceMode) => void;
  applyPollAverage: () => void;

  // Actions — reset
  resetToDefaults: () => void;
}

// -- Helper: run poll average and update candidate baselines --

function runPollAverage(state: PrimaryState): Partial<PrimaryState> {
  const candidateIds = state.candidates.map((c) => c.id);
  const config: PollAveragingConfig = {
    ...state.pollAveragingConfig,
    referenceDate: new Date().toISOString().slice(0, 10),
  };
  const { averages } = computePollingAverage(state.polls, config, candidateIds);

  // Only update if we got valid averages (at least one poll enabled)
  const hasAnyAverage = averages.some((a) => a.average > 0);
  if (!hasAnyAverage) return {};

  const averageMap = new Map(averages.map((a) => [a.candidateId, a.average]));
  return {
    candidates: state.candidates.map((c) => ({
      ...c,
      pollingBaseline: averageMap.get(c.id) ?? c.pollingBaseline,
    })),
  };
}

// -- Store creation --

export const usePrimaryStore = create<PrimaryState>((set) => ({
  candidates: DEFAULT_CANDIDATES.map((c) => ({ ...c })),
  globalParams: { ...DEFAULT_GLOBAL_PARAMS },
  activePresetId: 'even-field',
  mapMode: 'winner',
  heatmapCandidateId: null,
  predictions: null,
  statewideTotals: null,
  monteCarlo: null,
  isComputing: false,
  polls: BUILT_IN_POLLS.map((p) => ({ ...p })),
  pollAveragingConfig: { ...DEFAULT_AVERAGING_CONFIG },
  pollSource: 'scenario',

  setCandidates: (candidates) => set({ candidates }),

  setCandidateParam: (candidateId, param, value) =>
    set((state) => ({
      candidates: state.candidates.map((c) =>
        c.id === candidateId ? { ...c, [param]: value } : c,
      ),
    })),

  toggleCandidateActive: (candidateId) =>
    set((state) => ({
      candidates: state.candidates.map((c) =>
        c.id === candidateId ? { ...c, isActive: !c.isActive } : c,
      ),
    })),

  setGlobalParam: (param, value) =>
    set((state) => ({
      globalParams: { ...state.globalParams, [param]: value },
    })),

  setGlobalParams: (params) =>
    set((state) => ({
      globalParams: { ...state.globalParams, ...params },
    })),

  setActivePresetId: (id) => set({ activePresetId: id }),

  applyPreset: (candidateBaselines) =>
    set((state) => ({
      candidates: state.candidates.map((c) => ({
        ...c,
        pollingBaseline: candidateBaselines[c.id] ?? c.pollingBaseline,
      })),
    })),

  setMapMode: (mode) => set({ mapMode: mode }),

  setHeatmapCandidate: (candidateId) => set({ heatmapCandidateId: candidateId }),

  setPredictions: (predictions) => set({ predictions }),

  setStatewideTotals: (totals) => set({ statewideTotals: totals }),

  setMonteCarlo: (mc) => set({ monteCarlo: mc }),

  setIsComputing: (computing) => set({ isComputing: computing }),

  // -- Poll averaging actions --

  addPoll: (poll) =>
    set((state) => {
      const newState = { polls: [...state.polls, poll] };
      if (state.pollSource === 'average') {
        const withNewPoll = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withNewPoll) };
      }
      return newState;
    }),

  removePoll: (pollId) =>
    set((state) => {
      const newPolls = state.polls.filter((p) => p.id !== pollId || p.isBuiltIn);
      const newState = { polls: newPolls };
      if (state.pollSource === 'average') {
        const withUpdatedPolls = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withUpdatedPolls) };
      }
      return newState;
    }),

  togglePollEnabled: (pollId) =>
    set((state) => {
      const newPolls = state.polls.map((p) =>
        p.id === pollId ? { ...p, isEnabled: !p.isEnabled } : p,
      );
      const newState = { polls: newPolls };
      if (state.pollSource === 'average') {
        const withUpdatedPolls = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withUpdatedPolls) };
      }
      return newState;
    }),

  updatePoll: (pollId, updates) =>
    set((state) => {
      const newPolls = state.polls.map((p) =>
        p.id === pollId ? { ...p, ...updates } : p,
      );
      const newState = { polls: newPolls };
      if (state.pollSource === 'average') {
        const withUpdatedPolls = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withUpdatedPolls) };
      }
      return newState;
    }),

  setPollAveragingConfig: (config) =>
    set((state) => {
      const newConfig = { ...state.pollAveragingConfig, ...config };
      const newState = { pollAveragingConfig: newConfig };
      if (state.pollSource === 'average') {
        const withUpdatedConfig = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withUpdatedConfig) };
      }
      return newState;
    }),

  setPollSource: (source) =>
    set((state) => {
      const newState: Partial<PrimaryState> = { pollSource: source };
      if (source === 'average') {
        const withNewSource = { ...state, ...newState };
        return { ...newState, ...runPollAverage(withNewSource) };
      }
      return newState;
    }),

  applyPollAverage: () =>
    set((state) => runPollAverage(state)),

  resetToDefaults: () =>
    set({
      candidates: DEFAULT_CANDIDATES.map((c) => ({ ...c })),
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      activePresetId: 'even-field',
      mapMode: 'winner',
      heatmapCandidateId: null,
      predictions: null,
      statewideTotals: null,
      monteCarlo: null,
      isComputing: false,
      polls: BUILT_IN_POLLS.map((p) => ({ ...p })),
      pollAveragingConfig: { ...DEFAULT_AVERAGING_CONFIG },
      pollSource: 'scenario',
    }),
}));
