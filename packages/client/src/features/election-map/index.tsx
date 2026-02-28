import { useState, useCallback } from 'react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { useMapStore } from '@/stores/mapStore';
import { useUrlState } from '@/shared/hooks/useUrlState';
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
      <div className="flex items-center gap-4 border-b bg-background px-4 py-2">
        <h2 className="text-lg font-semibold">Election Map</h2>
        <ElectionSelector />
        {mapDataLoading && (
          <span className="text-sm text-muted-foreground">Loading data...</span>
        )}
        {mapData && (
          <span className="text-sm text-muted-foreground">
            {mapData.wardCount.toLocaleString()} wards
          </span>
        )}
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        <WisconsinMap
          mapData={mapData}
          selectedWardId={selectedWardId}
          onWardClick={handleWardClick}
          onWardHover={handleWardHover}
        />

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-10">
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
