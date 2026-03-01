import { useState, useCallback } from 'react';
import { WisconsinMap, type MapViewState } from '@/shared/components/WisconsinMap';
import { MapLegend } from '@/features/election-map/components/MapLegend';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { formatElectionLabel } from '@/shared/lib/raceLabels';
import { ComparisonSelector } from './components/ComparisonSelector';
import { DifferenceMap } from './components/DifferenceMap';
import { useComparisonData } from './hooks/useComparisonData';
import type { RaceType } from '@/types/election';

type ViewMode = 'side-by-side' | 'difference';

export default function ElectionComparison() {
  usePageTitle('Compare Elections');

  const [yearA, setYearA] = useState(2024);
  const [raceA, setRaceA] = useState<RaceType>('president');
  const [yearB, setYearB] = useState(2020);
  const [raceB, setRaceB] = useState<RaceType>('president');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [syncedView, setSyncedView] = useState<MapViewState | null>(null);

  const { mapDataA, mapDataB, diffData, isLoading, error } = useComparisonData(
    yearA, raceA, yearB, raceB,
  );

  const handleWardClickA = useCallback((_wardId: string) => {
    // Ward detail could be added here in future
  }, []);
  const handleWardClickB = useCallback((_wardId: string) => {
    // Ward detail could be added here in future
  }, []);

  const handleMapMove = useCallback((vs: MapViewState) => {
    setSyncedView(vs);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex flex-wrap items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="text-lg font-semibold">Compare Elections</h2>

        <ComparisonSelector
          label="Election A:"
          year={yearA}
          race={raceA}
          onYearChange={setYearA}
          onRaceChange={setRaceA}
        />

        <span className="text-sm text-muted-foreground">vs.</span>

        <ComparisonSelector
          label="Election B:"
          year={yearB}
          race={raceB}
          onYearChange={setYearB}
          onRaceChange={setRaceB}
        />

        <div
          className="ml-auto flex items-center gap-1 rounded-md border border-border/30 bg-content2/50 p-0.5"
          role="tablist"
          aria-label="Comparison view mode"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              setViewMode(viewMode === 'side-by-side' ? 'difference' : 'side-by-side');
            }
          }}
        >
          <button
            role="tab"
            aria-selected={viewMode === 'side-by-side'}
            tabIndex={viewMode === 'side-by-side' ? 0 : -1}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              viewMode === 'side-by-side' ? 'bg-content1 font-medium shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => setViewMode('side-by-side')}
          >
            Side by Side
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'difference'}
            tabIndex={viewMode === 'difference' ? 0 : -1}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              viewMode === 'difference' ? 'bg-content1 font-medium shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => setViewMode('difference')}
          >
            Difference
          </button>
        </div>

        {isLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Loading election data">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Loading
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4">
          <QueryErrorState error={error} />
        </div>
      )}

      {/* Map content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'side-by-side' && (
          <div className="flex h-full flex-col md:flex-row">
            {/* Election A */}
            <div className="relative flex-1 border-b border-border/30 md:border-b-0 md:border-r">
              <div className="glass-panel absolute left-2 top-2 z-10 px-3 py-1.5 text-sm font-semibold">
                {formatElectionLabel(yearA, raceA)}
              </div>
              <WisconsinMap
                mapData={mapDataA}
                onWardClick={handleWardClickA}
                viewState={syncedView}
                onMove={handleMapMove}
              />
              <div className="absolute bottom-4 left-2 z-10">
                <MapLegend />
              </div>
            </div>

            {/* Election B */}
            <div className="relative flex-1">
              <div className="glass-panel absolute left-2 top-2 z-10 px-3 py-1.5 text-sm font-semibold">
                {formatElectionLabel(yearB, raceB)}
              </div>
              <WisconsinMap
                mapData={mapDataB}
                onWardClick={handleWardClickB}
                viewState={syncedView}
                onMove={handleMapMove}
              />
              <div className="absolute bottom-4 left-2 z-10">
                <MapLegend />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'difference' && (
          <DifferenceMap
            diffData={diffData}
          />
        )}
      </div>
    </div>
  );
}
