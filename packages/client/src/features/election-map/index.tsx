import { useState, useCallback } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { useMapStore } from '@/stores/mapStore';
import { useUrlState } from '@/shared/hooks/useUrlState';
import { useMapData } from './hooks/useMapData';
import { ElectionSelector } from './components/ElectionSelector';
import { MapLegend } from './components/MapLegend';
import { WardTooltip } from './components/WardTooltip';
import { WardDetailPanel } from './components/WardDetailPanel';
import { MetricToggle } from './components/MetricToggle';

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
  const displayMetric = useMapStore((s) => s.displayMetric);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Sync map state with URL params
  useUrlState();

  // Fetch election data for map coloring
  const { data: mapData, isLoading: mapDataLoading } = useMapData(
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
      <div className="glass-panel flex items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="text-lg font-semibold">Election Map</h2>
        <ElectionSelector />
        {mapDataLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Loading election data">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Loading data
          </span>
        )}
        {mapData && (
          <span className="text-sm text-muted-foreground">
            {mapData.wardCount.toLocaleString()} wards
          </span>
        )}
        <div className="ml-auto rounded-lg bg-content2/60 p-0.5">
          <MetricToggle />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        <WisconsinMap
          mapData={mapData}
          selectedWardId={selectedWardId}
          onWardClick={handleWardClick}
          onWardHover={handleWardHover}
          displayMetric={displayMetric}
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
            demCandidate={mapData?.demCandidate}
            repCandidate={mapData?.repCandidate}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}

        {/* Ward Detail Panel */}
        <WardDetailPanel />

        {/* Screen reader live region for hovered ward */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {tooltip && hoveredWardData
            ? `${tooltip.wardName}, ${tooltip.municipality}, ${tooltip.county} County. Margin: ${
                hoveredWardData.margin > 0
                  ? `Democrat plus ${hoveredWardData.margin.toFixed(1)}`
                  : hoveredWardData.margin < 0
                    ? `Republican plus ${Math.abs(hoveredWardData.margin).toFixed(1)}`
                    : 'Even'
              }.`
            : ''}
        </div>
      </div>
    </div>
  );
}
