import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Vote, MapPin, Flame } from 'lucide-react';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { usePrimaryStore } from '@/stores/primaryStore';
import { usePrimaryData } from './hooks/usePrimaryData';
import { usePrimaryUrlState } from './hooks/usePrimaryUrlState';
import { PollPresetSelector } from './components/PollPresetSelector';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import type { PrimaryMapMode } from '@/stores/primaryStore';
import type {
  PrimaryWorkerResponse,
  PrimaryRuPrediction,
} from '@/types/primary';
import type { PrimaryWardData as HookWardData } from './hooks/usePrimaryData';

interface WorkerWardData {
  ruId: string;
  county: string;
  centroidLng: number;
  centroidLat: number;
  blackPct: number;
  hispanicPct: number;
  collegePct: number;
  medianIncome: number;
  populationDensity: number;
  urbanRuralClass: 'urban' | 'suburban' | 'rural';
  votingAgePopulation: number;
  partisanLean: number;
}

interface TooltipState {
  wardId: string;
  wardName: string;
  county: string;
  municipality: string;
  x: number;
  y: number;
}

const MAP_MODE_OPTIONS: { mode: PrimaryMapMode; label: string; icon: typeof MapPin }[] = [
  { mode: 'winner', label: 'Winner', icon: MapPin },
  { mode: 'candidate-heatmap', label: 'Heatmap', icon: Flame },
];

function computeVAP(ward: HookWardData): number {
  const GENERAL_TURNOUT_RATE = 0.72;
  if (ward.totalVotes2024 > 0) {
    return Math.round(ward.totalVotes2024 / GENERAL_TURNOUT_RATE);
  }
  return 500;
}

export default function PrimarySimulator() {
  usePageTitle('Primary Simulator');

  const candidates = usePrimaryStore((s) => s.candidates);
  const globalParams = usePrimaryStore((s) => s.globalParams);
  const mapMode = usePrimaryStore((s) => s.mapMode);
  const heatmapCandidateId = usePrimaryStore((s) => s.heatmapCandidateId);
  const predictions = usePrimaryStore((s) => s.predictions);
  const statewideTotals = usePrimaryStore((s) => s.statewideTotals);
  const monteCarlo = usePrimaryStore((s) => s.monteCarlo);
  const isComputing = usePrimaryStore((s) => s.isComputing);

  const setMapMode = usePrimaryStore((s) => s.setMapMode);
  const setHeatmapCandidate = usePrimaryStore((s) => s.setHeatmapCandidate);
  const setPredictions = usePrimaryStore((s) => s.setPredictions);
  const setStatewideTotals = usePrimaryStore((s) => s.setStatewideTotals);
  const setMonteCarlo = usePrimaryStore((s) => s.setMonteCarlo);
  const setIsComputing = usePrimaryStore((s) => s.setIsComputing);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  // setTooltip will be passed to PrimaryMap component; void prevents unused-var error
  void setTooltip;
  const [workerError, setWorkerError] = useState<string | null>(null);

  usePrimaryUrlState();

  const { wardData, isLoading: dataLoading } = usePrimaryData();

  const workerWardData = useMemo((): WorkerWardData[] | null => {
    if (!wardData) return null;
    return wardData.map((w) => ({
      ruId: w.wardId,
      county: w.county,
      centroidLng: w.centroidLng,
      centroidLat: w.centroidLat,
      blackPct: w.demographics?.blackPct ?? 0,
      hispanicPct: w.demographics?.hispanicPct ?? 0,
      collegePct: w.demographics?.collegDegreePct ?? 0,
      medianIncome: w.demographics?.medianHouseholdIncome ?? 67000,
      populationDensity: w.demographics?.populationDensity ?? 100,
      urbanRuralClass: w.demographics?.urbanRuralClass ?? 'rural',
      votingAgePopulation: computeVAP(w),
      partisanLean: w.partisanLean,
    }));
  }, [wardData]);

  const activeCandidateCount = useMemo(
    () => candidates.filter((c) => c.isActive).length,
    [candidates],
  );

  const wardCount = predictions?.length ?? 0;

  const candidateNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of candidates) map.set(c.id, c.shortName);
    return map;
  }, [candidates]);

  const candidateColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of candidates) map.set(c.id, c.color);
    return map;
  }, [candidates]);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./primary.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current.onmessage = (e: MessageEvent<PrimaryWorkerResponse>) => {
      if (e.data.type === 'predictions' && e.data.predictions) {
        setPredictions(e.data.predictions);
        if (e.data.statewideTotals) setStatewideTotals(e.data.statewideTotals);
      }
      if (e.data.type === 'monteCarlo' && e.data.monteCarlo) {
        setMonteCarlo(e.data.monteCarlo);
        if (e.data.statewideTotals) setStatewideTotals(e.data.statewideTotals);
      }
      setIsComputing(false);
    };
    workerRef.current.onerror = (e: ErrorEvent) => {
      console.error('Primary worker error:', e.message);
      setWorkerError('Worker error: ' + e.message);
      setIsComputing(false);
    };
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setPredictions, setStatewideTotals, setMonteCarlo, setIsComputing]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workerWardData || !workerRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsComputing(true);
      setWorkerError(null);
      const activeCandidates = candidates.filter((c) => c.isActive);
      workerRef.current?.postMessage({
        type: 'predict',
        candidates: activeCandidates,
        wardData: workerWardData,
        globalParams,
      });
      setTimeout(() => {
        workerRef.current?.postMessage({
          type: 'monteCarlo',
          candidates: activeCandidates,
          wardData: workerWardData,
          globalParams,
          monteCarloIterations: 2000,
        });
      }, 100);
    }, 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [candidates, globalParams, workerWardData, setIsComputing]);

  const hoveredPrediction = useMemo((): PrimaryRuPrediction | null => {
    if (!tooltip || !predictions) return null;
    return predictions.find((p) => p.ruId === tooltip.wardId) ?? null;
  }, [tooltip, predictions]);

  const handleMapModeChange = useCallback(
    (mode: PrimaryMapMode) => {
      setMapMode(mode);
      if (mode === 'candidate-heatmap' && !heatmapCandidateId) {
        const firstActive = candidates.find((c) => c.isActive);
        if (firstActive) setHeatmapCandidate(firstActive.id);
      }
    },
    [setMapMode, heatmapCandidateId, candidates, setHeatmapCandidate],
  );

  const handleHeatmapCandidateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHeatmapCandidate(e.target.value);
    },
    [setHeatmapCandidate],
  );

  const getCandidateName = useCallback(
    (id: string) => candidateNameMap.get(id) ?? id,
    [candidateNameMap],
  );

  const getCandidateColor = useCallback(
    (id: string) => candidateColorMap.get(id) ?? '#94a3b8',
    [candidateColorMap],
  );

  const mapModeLabel = mapMode === 'candidate-heatmap' && heatmapCandidateId
    ? ' (' + getCandidateName(heatmapCandidateId) + ' heatmap)'
    : ' (winner view)';

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex flex-wrap items-center gap-x-4 gap-y-1 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Vote className="h-5 w-5" aria-hidden="true" />
          Primary Simulator
        </h2>

        {isComputing && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Computing primary predictions">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
            Computing
          </span>
        )}

        {wardCount > 0 && !isComputing && (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {wardCount.toLocaleString()} wards · {activeCandidateCount} candidates
          </span>
        )}

        {dataLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Loading primary data">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Loading data
          </span>
        )}

        {/* Map mode toggle */}
        <div className="ml-auto flex items-center gap-1" role="tablist" aria-label="Map display mode">
          {MAP_MODE_OPTIONS.map(({ mode, label, icon: Icon }) => {
            const isActive = mapMode === mode;
            const cls = 'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors '
              + (isActive ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground');
            return (
              <button key={mode} role="tab" aria-selected={isActive} onClick={() => handleMapModeChange(mode)} className={cls}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Heatmap candidate selector (only visible in heatmap mode) */}
        {mapMode === 'candidate-heatmap' && (
          <select
            value={heatmapCandidateId ?? ''}
            onChange={handleHeatmapCandidateChange}
            className="rounded-md border border-border/60 bg-content2/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Select candidate for heatmap"
          >
            {candidates.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.shortName}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/40 bg-background/50 p-4" aria-label="Primary simulator controls">
          <PollPresetSelector />

          {/* CandidateCards placeholder -- separate component */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidates</h3>
            {candidates.map((c) => {
              const cls = 'flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm '
                + (c.isActive ? 'opacity-100' : 'opacity-40');
              return (
                <div key={c.id} className={cls}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.pollingBaseline}%</span>
                </div>
              );
            })}
            {/* TODO: Replace with <CandidateCards /> component */}
          </div>

          {/* Global parameters placeholder */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model Parameters</h3>
            <div className="rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground">
              <p>Turnout: {globalParams.turnoutRate}%</p>
              <p>Temperature: {globalParams.temperature}</p>
              <p>Geo weight: {globalParams.geoWeight}</p>
              <p>Ideology weight: {globalParams.ideologyWeight}</p>
              <p>Demo weight: {globalParams.demographicWeight}</p>
              <p>Endorsement weight: {globalParams.endorsementWeight}</p>
            </div>
            {/* TODO: Replace with <GlobalParamsPanel /> component */}
          </div>

          {/* Statewide results summary placeholder */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statewide Results</h3>
            {statewideTotals && statewideTotals.length > 0 ? (
              <div className="space-y-1">
                {statewideTotals.slice().sort((a, b) => b.votes - a.votes).map((cv) => (
                  <div key={cv.candidateId} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCandidateColor(cv.candidateId) }} aria-hidden="true" />
                    <span className="flex-1 truncate">{getCandidateName(cv.candidateId)}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">{(cv.voteShare * 100).toFixed(1)}%</span>
                    <span className="tabular-nums text-xs text-muted-foreground">{cv.votes.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dataLoading ? 'Loading...' : 'Adjust parameters to see results'}
              </p>
            )}
            {/* TODO: Replace with <PrimaryResultsSummary /> component */}
          </div>

          {/* Monte Carlo win probabilities placeholder */}
          {monteCarlo && monteCarlo.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win Probabilities</h3>
              <div className="space-y-1">
                {monteCarlo.slice().sort((a, b) => b.winProbability - a.winProbability).map((mc) => (
                  <div key={mc.candidateId} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCandidateColor(mc.candidateId) }} aria-hidden="true" />
                    <span className="flex-1 truncate">{getCandidateName(mc.candidateId)}</span>
                    <span className="tabular-nums text-xs font-medium">{(mc.winProbability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              {/* TODO: Replace with <MonteCarloPanel /> component */}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="relative flex-1">
          {workerError && (
            <div className="absolute inset-x-0 top-2 z-30 mx-auto max-w-sm px-2">
              <QueryErrorState error={new Error(workerError)} onRetry={() => setWorkerError(null)} compact />
            </div>
          )}

          {dataLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
              <div className="glass-panel p-4">Loading ward boundaries and demographics...</div>
            </div>
          )}

          {/* PrimaryMap placeholder -- separate component */}
          <div className="flex h-full w-full items-center justify-center bg-content2/30 text-muted-foreground" aria-label="Primary election results map">
            {dataLoading ? (
              <span className="text-sm">Loading map data...</span>
            ) : wardCount > 0 ? (
              <span className="text-sm">Map rendering {wardCount.toLocaleString()} wards{mapModeLabel}</span>
            ) : (
              <span className="text-sm">Waiting for prediction data...</span>
            )}
            {/* TODO: Replace with <PrimaryMap /> component */}
          </div>

          {/* Tooltip for hovered ward */}
          {tooltip && hoveredPrediction && (
            <div
              className="pointer-events-none absolute z-40 rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm"
              style={{ left: tooltip.x + 12, top: tooltip.y - 12, maxWidth: 260 }}
              role="tooltip"
            >
              <p className="text-xs font-semibold">{tooltip.wardName}</p>
              <p className="text-xs text-muted-foreground">{tooltip.municipality}, {tooltip.county}</p>
              <div className="mt-1.5 space-y-0.5">
                {hoveredPrediction.candidates.slice().sort((a, b) => b.voteShare - a.voteShare).slice(0, 4).map((cv) => (
                  <div key={cv.candidateId} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCandidateColor(cv.candidateId) }} aria-hidden="true" />
                    <span className="flex-1 truncate">{getCandidateName(cv.candidateId)}</span>
                    <span className="tabular-nums font-medium">{(cv.voteShare * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{hoveredPrediction.totalVotes.toLocaleString()} total votes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
