import { useState, useCallback } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { useMapStore } from '@/stores/mapStore';
import { useUrlState } from '@/shared/hooks/useUrlState';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useMapData } from './hooks/useMapData';
import { ElectionSelector } from './components/ElectionSelector';
import { MapLegend } from './components/MapLegend';
import { WardTooltip } from './components/WardTooltip';
import { WardDetailPanel } from './components/WardDetailPanel';

interface TooltipState {
  wardId: string;
  wardName: string;
  municipality: string;
  county: string;
  x: number;
  y: number;
}

export default function ElectionMap() {
  const activeElection = useMapStore((s) => s.activeElection);
  const selectedWardId = useMapStore((s) => s.selectedWardId);
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Sync map state with URL params
  useUrlState();

  usePageTitle('Election Map');

  // Fetch election data for map coloring
  const { data: mapData, isLoading: mapDataLoading, isError, error, refetch } = useMapData(
    activeElection?.year ?? null,
    activeElection?.raceType ?? null,
  );

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

  // Get hovered ward's election data for tooltip
  const hoveredWardData = tooltip && mapData?.data?.[tooltip.wardId];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-none border-x-0 border-t-0 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
        <h2 className="text-base font-semibold sm:text-lg">Election Map</h2>
        <ElectionSelector />
        {mapDataLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            Loading data
          </span>
        )}
        {mapData && (
          <span className="text-sm text-muted-foreground">
            {mapData.wardCount.toLocaleString()} wards
          </span>
        )}
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        {isError && (
          <div className="absolute inset-x-0 top-2 z-30 mx-auto max-w-sm px-2">
            <QueryErrorState error={error} onRetry={() => refetch()} compact />
          </div>
        )}

        {mapDataLoading && !mapData && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
            <div className="glass-panel flex items-center gap-3 px-5 py-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              Loading election data...
            </div>
          </div>
        )}

        <WisconsinMap
          mapData={mapData}
          selectedWardId={selectedWardId}
          onWardClick={handleWardClick}
          onWardHover={handleWardHover}
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-2 z-20 max-w-[calc(100%-1rem)] sm:bottom-6 sm:left-4">
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
            x={tooltip.x}
            y={tooltip.y}
          />
        )}

        {/* Ward Detail Panel */}
        <WardDetailPanel />
      </div>
    </div>
  );
}
