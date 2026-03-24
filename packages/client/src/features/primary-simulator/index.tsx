import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Vote, MapPin, Flame } from 'lucide-react';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { usePrimaryStore } from '@/stores/primaryStore';
import { usePrimaryData } from './hooks/usePrimaryData';
import { usePrimaryUrlState } from './hooks/usePrimaryUrlState';
import { PrimaryMap } from './components/PrimaryMap';
import { CandidateCardList } from './components/CandidateCardList';
import { PrimaryControlsPanel } from './components/PrimaryControlsPanel';
import { PollManager } from './components/PollManager';
import { PrimaryResultsSummary } from './components/PrimaryResultsSummary';
import { WinProbabilityBars } from './components/WinProbabilityBars';
import { PrimaryMapLegend } from './components/PrimaryMapLegend';
import { PrimaryTooltip } from './components/PrimaryTooltip';
import { MobileBottomPanel } from './components/MobileBottomPanel';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import type { PrimaryMapMode } from '@/stores/primaryStore';
import type {
  PrimaryWorkerResponse,
  PrimaryRuPrediction,
} from '@/types/primary';
import type { PrimaryWardData as HookWardData } from './hooks/usePrimaryData';
import type { TooltipState } from '@/shared/types/tooltip';

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
  const isComputing = usePrimaryStore((s) => s.isComputing);
  const pollSource = usePrimaryStore((s) => s.pollSource);
  const applyPollAverage = usePrimaryStore((s) => s.applyPollAverage);

  const setMapMode = usePrimaryStore((s) => s.setMapMode);
  const setHeatmapCandidate = usePrimaryStore((s) => s.setHeatmapCandidate);
  const setPredictions = usePrimaryStore((s) => s.setPredictions);
  const setStatewideTotals = usePrimaryStore((s) => s.setStatewideTotals);
  const setMonteCarlo = usePrimaryStore((s) => s.setMonteCarlo);
  const setIsComputing = usePrimaryStore((s) => s.setIsComputing);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);

  const { hasUrlState } = usePrimaryUrlState();

  // On mount, apply the appropriate data source:
  // - If URL state was restored, respect it (don't override with defaults)
  // - If in average mode, apply EWMA poll averaging
  // - If in scenario mode with no URL state, the store defaults already have
  //   "Even Field" baselines (12.5% each), so no action needed
  useEffect(() => {
    if (hasUrlState) return; // URL state takes precedence
    if (pollSource === 'average') {
      applyPollAverage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { wardData, isLoading: dataLoading, isDemographicsLoading } = usePrimaryData();

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

  // ---- Worker lifecycle ----
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

  // ---- Debounced model computation ----
  // Predict fires quickly (80ms) for responsive map updates.
  // Monte Carlo has its own slower debounce (500ms) to avoid redundant expensive runs.
  const predictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workerWardData || !workerRef.current) return;

    if (predictTimer.current) clearTimeout(predictTimer.current);
    predictTimer.current = setTimeout(() => {
      setIsComputing(true);
      setWorkerError(null);
      const activeCandidates = candidates.filter((c) => c.isActive);
      workerRef.current?.postMessage({
        type: 'predict',
        candidates: activeCandidates,
        wardData: workerWardData,
        globalParams,
      });
    }, 80);

    if (mcTimer.current) clearTimeout(mcTimer.current);
    mcTimer.current = setTimeout(() => {
      const activeCandidates = candidates.filter((c) => c.isActive);
      workerRef.current?.postMessage({
        type: 'monteCarlo',
        candidates: activeCandidates,
        wardData: workerWardData,
        globalParams,
        monteCarloIterations: 2000,
      });
    }, 500);

    return () => {
      if (predictTimer.current) clearTimeout(predictTimer.current);
      if (mcTimer.current) clearTimeout(mcTimer.current);
    };
  }, [candidates, globalParams, workerWardData, setIsComputing]);

  // ---- Hovered ward prediction lookup ----
  const hoveredPrediction = useMemo((): PrimaryRuPrediction | null => {
    if (!tooltip || !predictions) return null;
    return predictions.find((p) => p.ruId === tooltip.wardId) ?? null;
  }, [tooltip, predictions]);

  // ---- Map mode handlers ----
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

  // ---- Map hover callback ----
  const handleWardHover = useCallback(
    (
      ruId: string | null,
      properties: Record<string, unknown> | null,
      point: { x: number; y: number } | null,
    ) => {
      if (!ruId || !properties || !point) {
        setTooltip(null);
        return;
      }
      setTooltip({
        wardId: ruId,
        wardName: String(properties.ward_name ?? properties._wardId ?? ruId),
        county: String(properties.county ?? ''),
        municipality: String(properties.municipality ?? ''),
        x: point.x,
        y: point.y,
      });
    },
    [],
  );

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
            Loading ward data
          </span>
        )}

        {!dataLoading && isDemographicsLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground/60" role="status" aria-label="Loading demographics">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" aria-hidden="true" />
            Loading demographics
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
        {/* Desktop sidebar */}
        <div className="hidden md:flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/40 bg-background/50 p-4" aria-label="Primary simulator controls">
          <CandidateCardList />
          <PollManager />
          <PrimaryControlsPanel />
          <PrimaryResultsSummary />
          <WinProbabilityBars />
        </div>

        {/* Mobile bottom panel (replaces FAB + drawer) */}
        <MobileBottomPanel />

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

          {/* Interactive MapLibre GL map */}
          <PrimaryMap
            predictions={predictions}
            mapMode={mapMode}
            heatmapCandidateId={heatmapCandidateId}
            onWardHover={handleWardHover}
          />

          {/* Map legend overlay — shifted up on mobile to clear bottom panel */}
          <div className="absolute bottom-36 left-2 z-10 md:bottom-2">
            <PrimaryMapLegend />
          </div>

          {/* Tooltip for hovered ward */}
          {tooltip && hoveredPrediction && (
            <PrimaryTooltip
              ruName={tooltip.wardName}
              county={tooltip.county}
              prediction={hoveredPrediction}
              x={tooltip.x}
              y={tooltip.y}
            />
          )}
        </div>
      </div>
    </div>
  );
}
