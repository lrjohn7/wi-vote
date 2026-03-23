import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import {
  getWinnerColor,
  getCandidateColorScale,
  NO_DATA_COLOR,
  PRIMARY_MAP_COLORS,
} from '../lib/primaryColors';
import { WISCONSIN_GEO_CENTER, WISCONSIN_BOUNDS } from '@/shared/lib/mapConstants';
import type { PrimaryRuPrediction, PrimaryMapMode } from '@/stores/primaryStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIMARY_SOURCE = 'primary-wards';
const PRIMARY_FILL_LAYER = 'primary-fills';
const PRIMARY_LINE_LAYER = 'primary-lines';
const PRIMARY_HIGHLIGHT_LAYER = 'primary-highlight';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrimaryMapProps {
  predictions: PrimaryRuPrediction[] | null;
  mapMode: PrimaryMapMode;
  heatmapCandidateId: string | null;
  onWardClick?: (ruId: string) => void;
  onWardHover?: (
    ruId: string | null,
    properties: Record<string, unknown> | null,
    point: { x: number; y: number } | null,
  ) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PrimaryMap = memo(function PrimaryMap({
  predictions,
  mapMode,
  heatmapCandidateId,
  onWardClick,
  onWardHover,
}: PrimaryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const sourceAdded = useRef(false);
  const hoveredFeatureId = useRef<string | number | null>(null);

  // ---- Fetch ward boundaries (2022 vintage GeoJSON) ----
  const { data: boundaries } = useQuery({
    queryKey: queryKeys.wards.boundaries(2022),
    queryFn: () => api.getWardBoundaries(2022),
    staleTime: 30 * 60 * 1000,
  });

  // ---- Build a lookup from ward_id to prediction ----
  const predictionMap = useMemo(() => {
    if (!predictions) return null;
    const m = new Map<string, PrimaryRuPrediction>();
    for (const p of predictions) {
      m.set(p.ruId, p);
    }
    return m;
  }, [predictions]);

  // ---- Build colored GeoJSON from boundaries + predictions ----
  const coloredGeoJSON = useMemo((): GeoJSON.FeatureCollection | null => {
    if (!boundaries || !boundaries.features) return null;

    const features: GeoJSON.Feature[] = boundaries.features.map((feature) => {
      const props = feature.properties ?? {};
      const wardId = String(props.ward_id ?? feature.id ?? '');
      const pred = predictionMap?.get(wardId) ?? null;

      let fillColor = NO_DATA_COLOR;
      let fillOpacity = 0.65;

      if (pred) {
        if (mapMode === 'winner') {
          // winnerMargin from the model is 0-1 fraction; getWinnerColor expects percentage points
          fillColor = getWinnerColor(pred.winnerId, pred.winnerMargin * 100);
          fillOpacity = 0.85;
        } else if (mapMode === 'candidate-heatmap' && heatmapCandidateId) {
          const candidateVote = pred.candidates.find(
            (c) => c.candidateId === heatmapCandidateId,
          );
          const share = candidateVote?.voteShare ?? 0;
          const colorFn = getCandidateColorScale(heatmapCandidateId);
          fillColor = colorFn(share);
          fillOpacity = 0.85;
        }
      }

      return {
        ...feature,
        properties: {
          ...props,
          _fillColor: fillColor,
          _fillOpacity: fillOpacity,
          _wardId: wardId,
          _winnerId: pred?.winnerId ?? '',
          _winnerMargin: pred?.winnerMargin ?? 0,
          _totalVotes: pred?.totalVotes ?? 0,
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [boundaries, predictionMap, mapMode, heatmapCandidateId]);

  // ---- Initialize MapLibre GL map ----
  useEffect(() => {
    if (!mapContainer.current) return;

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
      center: WISCONSIN_GEO_CENTER,
      zoom: 6.5,
      maxBounds: WISCONSIN_BOUNDS,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    // On mobile, pad the bottom of the map to account for the persistent bottom panel
    if (window.innerWidth < 768) {
      m.setPadding({ top: 0, right: 0, bottom: 140, left: 0 });
    }

    // Force resize once to fix blank maps on mobile initial load
    m.once('idle', () => {
      m.resize();
    });

    m.on('load', () => {
      mapLoaded.current = true;
    });

    map.current = m;

    return () => {
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
      sourceAdded.current = false;
    };
  }, []);

  // ---- Add or update GeoJSON source and layers when colored data changes ----
  useEffect(() => {
    const m = map.current;
    if (!m || !coloredGeoJSON) return;

    const addOrUpdate = () => {
      if (sourceAdded.current) {
        // Update existing source data in-place
        const source = m.getSource(PRIMARY_SOURCE) as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(coloredGeoJSON);
        }
      } else {
        // First time: add source and all three layers
        m.addSource(PRIMARY_SOURCE, {
          type: 'geojson',
          data: coloredGeoJSON,
          generateId: true,
        });

        // Choropleth fill layer driven by per-feature _fillColor / _fillOpacity
        m.addLayer({
          id: PRIMARY_FILL_LAYER,
          type: 'fill',
          source: PRIMARY_SOURCE,
          paint: {
            'fill-color': ['get', '_fillColor'],
            'fill-opacity': ['get', '_fillOpacity'],
          },
        });

        // Ward boundary lines
        m.addLayer({
          id: PRIMARY_LINE_LAYER,
          type: 'line',
          source: PRIMARY_SOURCE,
          paint: {
            'line-color': PRIMARY_MAP_COLORS.wardStroke,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 0.1,
              8, 0.3,
              12, 0.8,
            ],
            'line-opacity': 0.4,
          },
        });

        // Highlight layer for hovered ward (uses feature-state)
        m.addLayer({
          id: PRIMARY_HIGHLIGHT_LAYER,
          type: 'line',
          source: PRIMARY_SOURCE,
          paint: {
            'line-color': PRIMARY_MAP_COLORS.wardStrokeHover,
            'line-width': 2.5,
            'line-opacity': [
              'case',
              ['boolean', ['feature-state', 'hovered'], false],
              0.9,
              0,
            ],
          },
        });

        sourceAdded.current = true;
      }
    };

    if (mapLoaded.current) {
      addOrUpdate();
    } else {
      const onLoad = () => addOrUpdate();
      m.on('load', onLoad);
      return () => {
        m.off('load', onLoad);
      };
    }
  }, [coloredGeoJSON]);

  // ---- Click handler ----
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!sourceAdded.current) return;
      const features = m.queryRenderedFeatures(e.point, {
        layers: [PRIMARY_FILL_LAYER],
      });

      if (features.length > 0 && onWardClick) {
        const wardId = String(features[0].properties?._wardId ?? '');
        if (wardId) {
          onWardClick(wardId);
        }
      }
    };

    m.on('click', PRIMARY_FILL_LAYER, handleClick);
    return () => {
      m.off('click', PRIMARY_FILL_LAYER, handleClick);
    };
  }, [onWardClick]);

  // ---- Hover handler (with feature-state highlight) ----
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    let lastMoveTime = 0;

    const handleMove = (e: maplibregl.MapMouseEvent) => {
      if (!sourceAdded.current) return;

      const now = performance.now();
      if (now - lastMoveTime < 16) return; // Throttle to ~60fps
      lastMoveTime = now;

      const features = m.queryRenderedFeatures(e.point, {
        layers: [PRIMARY_FILL_LAYER],
      });

      // Clear previous hover state
      if (hoveredFeatureId.current != null) {
        m.setFeatureState(
          { source: PRIMARY_SOURCE, id: hoveredFeatureId.current },
          { hovered: false },
        );
      }

      if (features.length > 0) {
        const feature = features[0];
        const wardId = String(feature.properties?._wardId ?? '');
        const featureId = feature.id;

        if (featureId != null) {
          hoveredFeatureId.current = featureId;
          m.setFeatureState(
            { source: PRIMARY_SOURCE, id: featureId },
            { hovered: true },
          );
        }

        m.getCanvas().style.cursor = 'pointer';

        if (onWardHover && wardId) {
          onWardHover(
            wardId,
            feature.properties as Record<string, unknown>,
            { x: e.point.x, y: e.point.y },
          );
        }
      } else {
        hoveredFeatureId.current = null;
        m.getCanvas().style.cursor = '';
        if (onWardHover) {
          onWardHover(null, null, null);
        }
      }
    };

    const handleLeave = () => {
      if (!sourceAdded.current) return;

      if (hoveredFeatureId.current != null) {
        m.setFeatureState(
          { source: PRIMARY_SOURCE, id: hoveredFeatureId.current },
          { hovered: false },
        );
        hoveredFeatureId.current = null;
      }
      m.getCanvas().style.cursor = '';
      if (onWardHover) {
        onWardHover(null, null, null);
      }
    };

    m.on('mousemove', PRIMARY_FILL_LAYER, handleMove);
    m.on('mouseleave', PRIMARY_FILL_LAYER, handleLeave);

    return () => {
      m.off('mousemove', PRIMARY_FILL_LAYER, handleMove);
      m.off('mouseleave', PRIMARY_FILL_LAYER, handleLeave);
    };
  }, [onWardHover]);

  // ---- Keyboard navigation ----
  useEffect(() => {
    const container = mapContainer.current;
    const m = map.current;
    if (!container || !m) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const PAN_AMOUNT = 100;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          m.panBy([0, -PAN_AMOUNT]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          m.panBy([0, PAN_AMOUNT]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          m.panBy([-PAN_AMOUNT, 0]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          m.panBy([PAN_AMOUNT, 0]);
          break;
        case '+':
        case '=':
          e.preventDefault();
          m.zoomIn({ duration: 200 });
          break;
        case '-':
          e.preventDefault();
          m.zoomOut({ duration: 200 });
          break;
        case 'Escape':
          e.preventDefault();
          m.jumpTo({ center: WISCONSIN_GEO_CENTER, zoom: 6.5 });
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- Reset view button handler ----
  const handleResetView = useCallback(() => {
    map.current?.jumpTo({ center: WISCONSIN_GEO_CENTER, zoom: 6.5 });
  }, []);

  return (
    <div className="relative h-full w-full" style={{ minHeight: 'min(400px, 50vh)' }}>
      <div
        ref={mapContainer}
        className="h-full w-full"
        role="application"
        aria-label="Wisconsin primary election map. Use arrow keys to pan, +/- to zoom, Escape to reset view."
        tabIndex={0}
      />
      <button
        onClick={handleResetView}
        className="absolute right-2 top-24 z-10 rounded-md border border-border/50 bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
        aria-label="Reset map to default view"
      >
        Reset View
      </button>
    </div>
  );
});
