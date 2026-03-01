import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { useMapStore } from '@/stores/mapStore';
import { useModelStore } from '@/stores/modelStore';
import { useWardBoundaries } from '@/features/election-map/hooks/useWardBoundaries';
import { MapLegend } from '@/features/election-map/components/MapLegend';
import { WardTooltip } from '@/features/election-map/components/WardTooltip';
import { WardDetailPanel } from '@/features/election-map/components/WardDetailPanel';
import { useModelData } from './hooks/useModelData';
import { useModelerUrlState } from './hooks/useModelerUrlState';
import { ControlsPanel } from './components/ControlsPanel';
import { ResultsSummary } from './components/ResultsSummary';
import { UncertaintyOverlay } from './components/UncertaintyOverlay';
import { extractWardMetadata } from '@/shared/lib/wardMetadata';
import { buildWardRegionMap } from '@/shared/lib/regionMapping';
import { uncertaintyToOpacityMap } from './lib/computeUncertainty';
import { fetchMrpPrediction, mrpResponseToPredictions } from '@/services/mrpApi';
import type { RaceType, Prediction, UncertaintyBand } from '@/types/election';
import type { MapDataResponse, WardMapEntry } from '@/features/election-map/hooks/useMapData';

interface TooltipState {
  wardId: string;
  wardName: string;
  municipality: string;
  county: string;
  x: number;
  y: number;
}

function predictionsToMapData(
  predictions: Prediction[],
  year: number,
  raceType: string,
): MapDataResponse {
  const data: Record<string, WardMapEntry> = {};
  for (const p of predictions) {
    data[p.wardId] = {
      demPct: p.predictedDemPct,
      repPct: p.predictedRepPct,
      margin: p.predictedMargin,
      totalVotes: p.predictedTotalVotes,
      demVotes: p.predictedDemVotes,
      repVotes: p.predictedRepVotes,
      isEstimate: false,
    };
  }
  return {
    year,
    raceType,
    wardCount: predictions.length,
    data,
  };
}

const REGIONAL_PARAM_KEYS = [
  'swing_milwaukee_metro',
  'swing_madison_metro',
  'swing_fox_valley',
  'swing_rural',
] as const;

const REGION_ID_MAP: Record<string, string> = {
  swing_milwaukee_metro: 'milwaukee_metro',
  swing_madison_metro: 'madison_metro',
  swing_fox_valley: 'fox_valley',
  swing_rural: 'rural',
};

const REGIONAL_TURNOUT_PARAM_KEYS = [
  'turnout_milwaukee_metro',
  'turnout_madison_metro',
  'turnout_fox_valley',
  'turnout_rural',
] as const;

const TURNOUT_REGION_ID_MAP: Record<string, string> = {
  turnout_milwaukee_metro: 'milwaukee_metro',
  turnout_madison_metro: 'madison_metro',
  turnout_fox_valley: 'fox_valley',
  turnout_rural: 'rural',
};

const DEMOGRAPHIC_TURNOUT_PARAM_KEYS = [
  'turnout_urban',
  'turnout_suburban',
  'turnout_rural_class',
] as const;

const TURNOUT_CLASSIFICATION_MAP: Record<string, string> = {
  turnout_urban: 'urban',
  turnout_suburban: 'suburban',
  turnout_rural_class: 'rural',
};

export default function SwingModeler() {
  const selectedWardId = useMapStore((s) => s.selectedWardId);
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);

  const activeModelId = useModelStore((s) => s.activeModelId);
  const parameters = useModelStore((s) => s.parameters);
  const predictions = useModelStore((s) => s.predictions);
  const isComputing = useModelStore((s) => s.isComputing);
  const setPredictions = useModelStore((s) => s.setPredictions);
  const setIsComputing = useModelStore((s) => s.setIsComputing);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showUncertainty, setShowUncertainty] = useState(false);
  const [uncertainty, setUncertainty] = useState<UncertaintyBand[] | null>(null);

  // URL state sync
  useModelerUrlState();

  // Derive base election from model parameters
  const baseYear = Number(parameters.baseElectionYear) || 2024;
  const baseRace = (parameters.baseRaceType as RaceType) || 'president';
  const swingPoints = (parameters.swingPoints as number) ?? 0;
  const turnoutChange = (parameters.turnoutChange as number) ?? 0;

  // Fetch ward boundaries (cached)
  const { data: boundaries, isLoading: boundariesLoading } = useWardBoundaries();

  // Fetch base election map data and convert to WardData[]
  const { wardData, baseMapData, isLoading: dataLoading } = useModelData(
    baseYear, baseRace, boundaries,
  );

  // Ward metadata for aggregations
  const wardMetadata = useMemo(() => extractWardMetadata(boundaries), [boundaries]);

  // Ward region map for regional swing
  const wardRegions = useMemo(() => buildWardRegionMap(wardMetadata), [wardMetadata]);

  // Ward classifications for demographic model (urban/suburban/rural)
  // Uses population density from boundaries if available, else falls back to region mapping.
  // wardRegions is derived from boundaries via wardMetadata, so it's stable whenever
  // boundaries is stable — no need to list it as a dependency.
  const wardClassifications = useMemo(() => {
    if (!boundaries) return {};
    const classifications: Record<string, string> = {};
    for (const feature of boundaries.features) {
      const props = feature.properties;
      if (!props) continue;
      const wardId = String(props.ward_id ?? '');
      if (!wardId) continue;
      const density = props.population_density as number | undefined;
      if (density !== undefined && density > 0) {
        if (density > 3000) classifications[wardId] = 'urban';
        else if (density > 500) classifications[wardId] = 'suburban';
        else classifications[wardId] = 'rural';
      } else {
        // Fall back to region mapping
        const region = wardRegions[wardId];
        if (region === 'milwaukee_metro' || region === 'madison_metro') {
          classifications[wardId] = 'urban';
        } else if (region === 'fox_valley') {
          classifications[wardId] = 'suburban';
        } else {
          classifications[wardId] = 'rural';
        }
      }
    }
    return classifications;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaries]);

  // Build regional swing from params
  const regionalSwing = useMemo(() => {
    const swing: Record<string, number> = {};
    let hasAny = false;
    for (const paramKey of REGIONAL_PARAM_KEYS) {
      const val = (parameters[paramKey] as number) ?? 0;
      if (val !== 0) hasAny = true;
      swing[REGION_ID_MAP[paramKey]] = val;
    }
    return hasAny ? swing : undefined;
  }, [parameters]);

  // Build regional turnout from params
  const regionalTurnout = useMemo(() => {
    const turnout: Record<string, number> = {};
    let hasAny = false;
    for (const paramKey of REGIONAL_TURNOUT_PARAM_KEYS) {
      const val = (parameters[paramKey] as number) ?? 0;
      if (val !== 0) hasAny = true;
      turnout[TURNOUT_REGION_ID_MAP[paramKey]] = val;
    }
    return hasAny ? turnout : undefined;
  }, [parameters]);

  // Build demographic turnout from params
  const demographicTurnout = useMemo(() => {
    const turnout: Record<string, number> = {};
    let hasAny = false;
    for (const paramKey of DEMOGRAPHIC_TURNOUT_PARAM_KEYS) {
      const val = (parameters[paramKey] as number) ?? 0;
      if (val !== 0) hasAny = true;
      turnout[TURNOUT_CLASSIFICATION_MAP[paramKey]] = val;
    }
    return hasAny ? turnout : undefined;
  }, [parameters]);

  // Memoize the serialized ward data sent to the worker to avoid re-mapping
  // 7,000 objects on every slider tick (wardData only changes when base election changes)
  const serializedWardData = useMemo(() => {
    if (!wardData) return null;
    return wardData.map((w) => ({
      wardId: w.wardId,
      elections: w.elections,
    }));
  }, [wardData]);

  // Web Worker
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./model.worker.ts', import.meta.url),
      { type: 'module' },
    );

    workerRef.current.onmessage = (e: MessageEvent<{ predictions: Prediction[]; uncertainty?: UncertaintyBand[] }>) => {
      setPredictions(e.data.predictions);
      if (e.data.uncertainty) {
        setUncertainty(e.data.uncertainty);
      }
      setIsComputing(false);
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setPredictions, setIsComputing]);

  // Debounce timer for posting to worker / server
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track in-flight MRP request to cancel stale ones
  const mrpAbortRef = useRef<AbortController | null>(null);

  // Post to worker or server when parameters or ward data change
  useEffect(() => {
    if (activeModelId === 'mrp') {
      // MRP: route to server API
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        // Cancel any in-flight MRP request
        mrpAbortRef.current?.abort();
        const controller = new AbortController();
        mrpAbortRef.current = controller;

        setIsComputing(true);
        fetchMrpPrediction({
          baseElectionYear: baseYear,
          baseRaceType: baseRace,
          turnoutChange,
          collegeShift: (parameters.collegeShift as number) ?? 0,
          urbanShift: (parameters.urbanShift as number) ?? 0,
          ruralShift: (parameters.ruralShift as number) ?? 0,
          incomeShift: (parameters.incomeShift as number) ?? 0,
        })
          .then((response) => {
            if (controller.signal.aborted) return;
            const { predictions: preds, uncertainty: unc } = mrpResponseToPredictions(response);
            setPredictions(preds);
            setUncertainty(unc);
            setIsComputing(false);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            console.error('MRP prediction failed:', err);
            setIsComputing(false);
          });
      }, 300); // Longer debounce for server calls

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    // Client-side models: post to Web Worker
    if (!serializedWardData || !workerRef.current) return;

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsComputing(true);
      workerRef.current?.postMessage({
        wardData: serializedWardData,
        params: {
          baseElectionYear: String(baseYear),
          baseRaceType: baseRace,
          swingPoints,
          turnoutChange,
          urbanSwing: (parameters.urbanSwing as number) ?? 0,
          suburbanSwing: (parameters.suburbanSwing as number) ?? 0,
          ruralSwing: (parameters.ruralSwing as number) ?? 0,
        },
        modelType: activeModelId,
        wardRegions: Object.keys(wardRegions).length > 0 ? wardRegions : undefined,
        regionalSwing,
        wardClassifications: Object.keys(wardClassifications).length > 0 ? wardClassifications : undefined,
        regionalTurnout,
        demographicTurnout,
        computeUncertainty: showUncertainty,
      });
    }, 50);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [serializedWardData, baseYear, baseRace, swingPoints, turnoutChange, activeModelId, wardRegions, regionalSwing, wardClassifications, regionalTurnout, demographicTurnout, showUncertainty, parameters, setIsComputing, setPredictions]);

  // Convert predictions to MapDataResponse for the map
  const mapData = useMemo(() => {
    if (predictions && predictions.length > 0) {
      return predictionsToMapData(predictions, baseYear, baseRace);
    }
    return baseMapData;
  }, [predictions, baseMapData, baseYear, baseRace]);

  // Compute ward opacities from uncertainty bands
  const wardOpacities = useMemo(() => {
    if (!showUncertainty || !uncertainty) return null;
    return uncertaintyToOpacityMap(uncertainty);
  }, [showUncertainty, uncertainty]);

  const handleWardClick = useCallback(
    (wardId: string) => {
      setSelectedWard(wardId === selectedWardId ? null : wardId);
    },
    [selectedWardId, setSelectedWard],
  );

  const handleWardHover = useCallback(
    (
      wardId: string | null,
      properties: Record<string, unknown> | null,
      point: { x: number; y: number } | null,
    ) => {
      if (wardId && properties && point) {
        setTooltip({
          wardId,
          wardName: String(properties.ward_name ?? ''),
          municipality: String(properties.municipality ?? ''),
          county: String(properties.county ?? ''),
          x: point.x,
          y: point.y,
        });
      } else {
        setTooltip(null);
      }
    },
    [],
  );

  // Hovered ward data for tooltip
  const hoveredWardData = tooltip && mapData?.data?.[tooltip.wardId];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="text-lg font-semibold">Swing Modeler</h2>
        {isComputing && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Computing model predictions">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
            Computing
          </span>
        )}
        {mapData && !isComputing && (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {mapData.wardCount.toLocaleString()} wards
          </span>
        )}
        {dataLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Loading base election data">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Loading base data
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showUncertainty}
              onChange={(e) => setShowUncertainty(e.target.checked)}
              className="h-3.5 w-3.5 rounded border"
            />
            Uncertainty
          </label>
        </div>
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: controls + results */}
        <ControlsPanel>
          <ResultsSummary
            predictions={predictions}
            baseMapData={baseMapData}
            wardMetadata={wardMetadata}
          />
        </ControlsPanel>

        {/* Map area */}
        <div className="relative flex-1">
          {boundariesLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
              <div className="glass-panel p-4">
                Loading ward boundaries...
              </div>
            </div>
          )}

          <WisconsinMap
            mapData={mapData}
            selectedWardId={selectedWardId}
            onWardClick={handleWardClick}
            onWardHover={handleWardHover}
            wardOpacities={wardOpacities}
          />

          {/* Legend */}
          <div className="absolute bottom-6 left-4 z-20">
            <MapLegend />
          </div>

          {/* Tooltip */}
          {tooltip && (
            <WardTooltip
              wardName={tooltip.wardName}
              municipality={tooltip.municipality}
              county={tooltip.county}
              demPct={hoveredWardData?.demPct}
              repPct={hoveredWardData?.repPct}
              margin={hoveredWardData?.margin}
              totalVotes={hoveredWardData?.totalVotes}
              isEstimate={hoveredWardData?.isEstimate}
              demCandidate={baseMapData?.demCandidate}
              repCandidate={baseMapData?.repCandidate}
              x={tooltip.x}
              y={tooltip.y}
            />
          )}

          {/* Uncertainty overlay */}
          <UncertaintyOverlay uncertainty={uncertainty} visible={showUncertainty} />

          {/* Ward Detail Panel */}
          <WardDetailPanel />
        </div>
      </div>
    </div>
  );
}
