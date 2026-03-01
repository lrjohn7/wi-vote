import { useEffect, useRef, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { choroplethFillColor } from '@/shared/lib/colorScale';
import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';

const WISCONSIN_CENTER: [number, number] = [-87.95, 43.04]; // Milwaukee metro
const WISCONSIN_BOUNDS: [[number, number], [number, number]] = [
  [-93.0, 42.3],
  [-86.7, 47.2],
];

const WARD_SOURCE = 'wards';
const WARD_LAYER_FILL = 'ward-fills';
const WARD_LAYER_LINE = 'ward-lines';
const WARD_LAYER_HIGHLIGHT = 'ward-highlight';

let protocolAdded = false;

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

interface WisconsinMapProps {
  mapData?: MapDataResponse | null;
  selectedWardId?: string | null;
  onWardClick?: (wardId: string, properties: Record<string, unknown>) => void;
  onWardHover?: (
    wardId: string | null,
    properties: Record<string, unknown> | null,
    point: { x: number; y: number } | null,
  ) => void;
  /** Per-ward opacity overrides (e.g. from uncertainty). Values 0-1. */
  wardOpacities?: Record<string, number> | null;
  /** Controlled view state for syncing multiple maps */
  viewState?: MapViewState | null;
  /** Called when the user moves the map */
  onMove?: (viewState: MapViewState) => void;
  /** Called when the set of visible wards changes (after pan/zoom) */
  onVisibleWardsChange?: (wardIds: string[]) => void;
}

const WARD_SOURCE_LAYER = 'wards';

export const WisconsinMap = memo(function WisconsinMap({
  mapData,
  selectedWardId,
  onWardClick,
  onWardHover,
  wardOpacities,
  viewState,
  onMove,
  onVisibleWardsChange,
}: WisconsinMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const layersAdded = useRef(false);
  const prevMapDataRef = useRef<MapDataResponse | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  const prevOpacityWardIds = useRef<string[]>([]);
  const isSyncing = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!protocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      protocolAdded = true;
    }

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f0f0f0' },
          },
        ],
      },
      center: WISCONSIN_CENTER,
      zoom: 9,
      maxBounds: WISCONSIN_BOUNDS,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    m.on('load', () => {
      mapLoaded.current = true;

      // Add PMTiles vector source
      m.addSource(WARD_SOURCE, {
        type: 'vector',
        url: 'pmtiles:///tiles/wards.pmtiles',
        promoteId: { [WARD_SOURCE_LAYER]: 'ward_id' },
      });

      // Choropleth fill layer
      m.addLayer({
        id: WARD_LAYER_FILL,
        type: 'fill',
        source: WARD_SOURCE,
        'source-layer': WARD_SOURCE_LAYER,
        paint: {
          'fill-color': choroplethFillColor,
          'fill-opacity': [
            'coalesce',
            ['feature-state', 'opacity'],
            0.75,
          ],
        },
      });

      // Ward boundary lines
      m.addLayer({
        id: WARD_LAYER_LINE,
        type: 'line',
        source: WARD_SOURCE,
        'source-layer': WARD_SOURCE_LAYER,
        paint: {
          'line-color': '#666',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0.1,
            10, 0.5,
            14, 1,
          ],
          'line-opacity': 0.4,
        },
      });

      // Selected ward highlight
      m.addLayer({
        id: WARD_LAYER_HIGHLIGHT,
        type: 'line',
        source: WARD_SOURCE,
        'source-layer': WARD_SOURCE_LAYER,
        paint: {
          'line-color': '#000',
          'line-width': 3,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1,
            ['boolean', ['feature-state', 'hovered'], false],
            0.7,
            0,
          ],
        },
      });

      layersAdded.current = true;
    });

    map.current = m;

    return () => {
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
      layersAdded.current = false;
    };
  }, []);

  // Helper: check if map data has materially changed
  const hasDataChanged = useCallback((prev: MapDataResponse | null, next: MapDataResponse | null | undefined): boolean => {
    if (!prev && !next) return false;
    if (!prev || !next) return true;
    if (prev.wardCount !== next.wardCount) return true;
    if (prev.year !== next.year || prev.raceType !== next.raceType) return true;

    // Sample check: compare a few wards to detect changes without deep equality
    const prevKeys = Object.keys(prev.data);
    const nextKeys = Object.keys(next.data);
    if (prevKeys.length !== nextKeys.length) return true;

    const sampleSize = Math.min(10, prevKeys.length);
    const step = Math.max(1, Math.floor(prevKeys.length / sampleSize));
    for (let i = 0; i < prevKeys.length; i += step) {
      const key = prevKeys[i];
      const pEntry = prev.data[key];
      const nEntry = next.data[key];
      if (!nEntry) return true;
      if (pEntry.demPct !== nEntry.demPct || pEntry.margin !== nEntry.margin) return true;
    }

    return false;
  }, []);

  // Helper: apply current mapData to the map via setFeatureState
  const applyMapData = useCallback((m: maplibregl.Map, data: MapDataResponse | null | undefined) => {
    // Skip if data hasn't actually changed
    if (!hasDataChanged(prevMapDataRef.current, data)) return;

    // Clear previous feature states
    if (prevMapDataRef.current) {
      for (const wardId of Object.keys(prevMapDataRef.current.data)) {
        m.removeFeatureState({ source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId });
      }
    }

    // Apply new data
    if (data) {
      for (const [wardId, entry] of Object.entries(data.data)) {
        m.setFeatureState(
          { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId },
          {
            demPct: entry.demPct,
            repPct: entry.repPct,
            margin: entry.margin,
            totalVotes: entry.totalVotes,
            isEstimate: entry.isEstimate,
          },
        );
      }
    }

    prevMapDataRef.current = data ?? null;
  }, [hasDataChanged]);

  // Apply election data via setFeatureState once layers are ready
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (layersAdded.current) {
      applyMapData(m, mapData);
    } else {
      // Layers added on 'load' — wait for that, then apply
      const onLoad = () => applyMapData(m, mapData);
      m.on('load', onLoad);
      return () => { m.off('load', onLoad); };
    }
  }, [mapData, applyMapData]);

  // Apply per-ward opacity overrides (uncertainty visualization)
  useEffect(() => {
    const m = map.current;
    if (!m || !layersAdded.current) return;

    // Clear previous opacity states
    for (const wardId of prevOpacityWardIds.current) {
      m.setFeatureState(
        { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId },
        { opacity: null },
      );
    }

    if (wardOpacities) {
      const wardIds = Object.keys(wardOpacities);
      for (const wardId of wardIds) {
        m.setFeatureState(
          { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId },
          { opacity: wardOpacities[wardId] },
        );
      }
      prevOpacityWardIds.current = wardIds;
    } else {
      prevOpacityWardIds.current = [];
    }
  }, [wardOpacities]);

  // Update selected ward highlight
  useEffect(() => {
    const m = map.current;
    if (!m || !layersAdded.current) return;

    // Clear previous selection
    if (prevSelectedRef.current) {
      m.setFeatureState(
        { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: prevSelectedRef.current },
        { selected: false },
      );
    }

    if (selectedWardId) {
      m.setFeatureState(
        { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: selectedWardId },
        { selected: true },
      );
    }

    prevSelectedRef.current = selectedWardId ?? null;
  }, [selectedWardId]);

  // Click handler
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: [WARD_LAYER_FILL],
      });

      if (features.length > 0) {
        const feature = features[0];
        const wardId = feature.properties?.ward_id;
        if (wardId && onWardClick) {
          onWardClick(wardId, feature.properties ?? {});
        }
      }
    };

    m.on('click', WARD_LAYER_FILL, handleClick);
    return () => {
      m.off('click', WARD_LAYER_FILL, handleClick);
    };
  }, [onWardClick]);

  // Hover handler
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    let hoveredId: string | null = null;
    let lastMoveTime = 0;

    const handleMove = (e: maplibregl.MapMouseEvent) => {
      const now = performance.now();
      if (now - lastMoveTime < 16) return; // Throttle to ~60fps
      lastMoveTime = now;

      const features = m.queryRenderedFeatures(e.point, {
        layers: [WARD_LAYER_FILL],
      });

      // Clear previous hover
      if (hoveredId) {
        m.setFeatureState(
          { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: hoveredId },
          { hovered: false },
        );
      }

      if (features.length > 0) {
        const feature = features[0];
        const wardId = feature.properties?.ward_id;
        if (wardId) {
          hoveredId = wardId;
          m.setFeatureState(
            { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId },
            { hovered: true },
          );
          m.getCanvas().style.cursor = 'pointer';

          if (onWardHover) {
            onWardHover(wardId, feature.properties ?? {}, {
              x: e.point.x,
              y: e.point.y,
            });
          }
        }
      } else {
        hoveredId = null;
        m.getCanvas().style.cursor = '';
        if (onWardHover) {
          onWardHover(null, null, null);
        }
      }
    };

    const handleLeave = () => {
      if (hoveredId) {
        m.setFeatureState(
          { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: hoveredId },
          { hovered: false },
        );
        hoveredId = null;
      }
      m.getCanvas().style.cursor = '';
      if (onWardHover) {
        onWardHover(null, null, null);
      }
    };

    m.on('mousemove', WARD_LAYER_FILL, handleMove);
    m.on('mouseleave', WARD_LAYER_FILL, handleLeave);

    return () => {
      m.off('mousemove', WARD_LAYER_FILL, handleMove);
      m.off('mouseleave', WARD_LAYER_FILL, handleLeave);
    };
  }, [onWardHover]);

  // Emit viewport changes to parent (for syncing)
  useEffect(() => {
    const m = map.current;
    if (!m || !onMove) return;

    const handleMoveEnd = () => {
      if (isSyncing.current) return;
      const center = m.getCenter();
      onMove({
        center: [center.lng, center.lat],
        zoom: m.getZoom(),
      });
    };

    m.on('moveend', handleMoveEnd);
    return () => {
      m.off('moveend', handleMoveEnd);
    };
  }, [onMove]);

  // Emit visible ward IDs after pan/zoom
  useEffect(() => {
    const m = map.current;
    if (!m || !onVisibleWardsChange) return;

    const emitVisible = () => {
      try {
        if (!layersAdded.current) return;
        const features = m.queryRenderedFeatures({ layers: [WARD_LAYER_FILL] });
        const ids = Array.from(
          new Set(
            features
              .map((f) => String(f.properties?.ward_id ?? ''))
              .filter((id) => id !== ''),
          ),
        );
        onVisibleWardsChange(ids);
      } catch {
        // queryRenderedFeatures can fail if tiles aren't loaded yet — safe to ignore
      }
    };

    m.on('moveend', emitVisible);
    m.on('idle', emitVisible);

    return () => {
      m.off('moveend', emitVisible);
      m.off('idle', emitVisible);
    };
  }, [onVisibleWardsChange]);

  // Respond to external viewState changes (from synced map)
  useEffect(() => {
    const m = map.current;
    if (!m || !viewState) return;

    const currentCenter = m.getCenter();
    const currentZoom = m.getZoom();
    const [lng, lat] = viewState.center;

    // Skip if already at this position (avoid infinite loop)
    if (
      Math.abs(currentCenter.lng - lng) < 0.0001 &&
      Math.abs(currentCenter.lat - lat) < 0.0001 &&
      Math.abs(currentZoom - viewState.zoom) < 0.01
    ) {
      return;
    }

    isSyncing.current = true;
    m.jumpTo({ center: viewState.center, zoom: viewState.zoom });
    // Reset syncing flag after the move completes
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [viewState]);

  return (
    <div
      ref={mapContainer}
      className="h-full w-full"
      style={{ minHeight: 'min(400px, 50vh)' }}
      role="application"
      aria-label="Wisconsin election map"
      tabIndex={0}
    />
  );
});
