import { useState, useCallback, useEffect, useRef } from 'react';
import { Layers, X } from 'lucide-react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { MapLegend } from '@/features/election-map/components/MapLegend';
import { VintageTimeline } from './components/VintageTimeline';
import { BoundaryStats } from './components/BoundaryStats';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { useVintageBoundaries, WARD_VINTAGES } from './hooks/useVintageBoundaries';

export default function BoundaryHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVintage, setSelectedVintage] = useState(2022);
  const [comparisonVintage, setComparisonVintage] = useState<number | null>(2020);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch boundary GeoJSON for comparison overlay
  const { data: comparisonBoundaries, isError: boundaryError, error: boundaryErrorObj, refetch: boundaryRefetch } = useVintageBoundaries(comparisonVintage);

  // Ward counts from fetched data
  const selectedFeatureCount = 0; // PMTiles — we'll estimate from map
  const comparisonFeatureCount = comparisonBoundaries?.features?.length ?? 0;

  // Play/pause animation through vintages
  useEffect(() => {
    if (isPlaying) {
      const vintages = WARD_VINTAGES.map((v) => v.vintage);
      playIntervalRef.current = setInterval(() => {
        setSelectedVintage((prev) => {
          const idx = vintages.indexOf(prev);
          const nextIdx = (idx + 1) % vintages.length;
          return vintages[nextIdx];
        });
      }, 2000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="text-lg font-semibold">Ward Boundary History</h2>
        <span className="text-sm text-muted-foreground">
          Explore how Wisconsin's ward boundaries changed across redistricting cycles
        </span>
      </div>

      {/* Main content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute bottom-36 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-content1 shadow-lg border border-border/30 md:hidden"
          aria-label="Show timeline"
        >
          <Layers className="h-5 w-5" />
        </button>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }} role="presentation" />
        )}

        {/* Error state for boundary fetch */}
        {boundaryError && comparisonVintage && (
          <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2">
            <QueryErrorState error={boundaryErrorObj!} onRetry={() => boundaryRefetch()} compact />
          </div>
        )}

        {/* Sidebar — mobile drawer + desktop static */}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 overflow-y-auto border-r border-border/30 bg-content1 p-4 transition-transform duration-300 md:relative md:inset-auto md:z-auto md:w-[340px] md:max-w-none md:translate-x-0 md:bg-content1/50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Mobile close */}
          <div className="flex items-center justify-between md:hidden">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <button onClick={() => setSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-content2" aria-label="Close timeline">
              <X className="h-4 w-4" />
            </button>
          </div>
          <VintageTimeline
            selectedVintage={selectedVintage}
            comparisonVintage={comparisonVintage}
            onSelect={setSelectedVintage}
            onComparisonSelect={setComparisonVintage}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
          />

          <BoundaryStats
            selectedVintage={selectedVintage}
            comparisonVintage={comparisonVintage}
            selectedFeatureCount={selectedFeatureCount}
            comparisonFeatureCount={comparisonFeatureCount}
          />

          {/* Legend for comparison overlay */}
          {comparisonVintage && (
            <div className="glass-panel rounded-xl p-4">
              <h4 className="mb-2 text-sm font-semibold">Overlay Legend</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-6 rounded border border-border/30 bg-[#666]/20" />
                  <span className="text-muted-foreground">
                    Current boundaries (PMTiles)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-6 rounded border-2 border-dashed border-amber-500" />
                  <span className="text-muted-foreground">
                    {comparisonVintage} boundaries (overlay)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-xl border border-border/30 bg-content2/30 p-4 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">About Ward Vintages</p>
            <p className="mb-1.5">
              Wisconsin redraws ward boundaries after each Census and through
              ongoing municipal annexations.
            </p>
            <p className="mb-1.5">
              The <strong>2020 vintage</strong> is the canonical set used for
              longitudinal analysis. The <strong>2022 vintage</strong> reflects
              post-Census redistricting.
            </p>
            <p>
              Use the comparison overlay to see how boundaries shifted between
              vintages.
            </p>
          </div>
        </aside>

        {/* Map area */}
        <div className="relative flex-1">
          <WisconsinMap
            overlayGeoJSON={comparisonBoundaries ?? null}
          />

          {/* Comparison GeoJSON overlay rendered as an info card */}
          {comparisonVintage && comparisonBoundaries && (
            <div className="absolute left-4 top-4 z-10">
              <div className="glass-panel rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">Showing:</span>{' '}
                <span className="text-muted-foreground">
                  Current wards + {comparisonVintage} overlay
                  ({comparisonFeatureCount.toLocaleString()} wards)
                </span>
              </div>
            </div>
          )}

          {!comparisonVintage && (
            <div className="absolute left-4 top-4 z-10">
              <div className="glass-panel rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">Showing:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVintage} ward boundaries
                </span>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-6 left-4 z-20">
            <MapLegend />
          </div>
        </div>
      </div>
    </div>
  );
}
