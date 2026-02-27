import { useEffect, useRef, useCallback } from 'react';
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

interface WisconsinMapProps {
  boundariesGeoJSON?: GeoJSON.FeatureCollection | null;
  mapData?: MapDataResponse | null;
  selectedWardId?: string | null;
  onWardClick?: (wardId: string, properties: Record<string, unknown>) => void;
  onWardHover?: (
    wardId: string | null,
    properties: Record<string, unknown> | null,
    point: { x: number; y: number } | null,
  ) => void;
}

export function WisconsinMap({
  boundariesGeoJSON,
  mapData,
  selectedWardId,
  onWardClick,
  onWardHover,
}: WisconsinMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const boundariesAdded = useRef(false);
  const prevMapDataRef = useRef<MapDataResponse | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

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
    });

    map.current = m;

    return () => {
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
      boundariesAdded.current = false;
    };
  }, []);

  // Helper: apply current mapData to the map via setFeatureState
  const applyMapData = useCallback((m: maplibregl.Map, data: MapDataResponse | null | undefined) => {
    // Clear previous feature states
    if (prevMapDataRef.current) {
      for (const wardId of Object.keys(prevMapDataRef.current.data)) {
        m.removeFeatureState({ source: WARD_SOURCE, id: wardId });
      }
    }

    // Apply new data
    if (data) {
      const start = performance.now();
      for (const [wardId, entry] of Object.entries(data.data)) {
        m.setFeatureState(
          { source: WARD_SOURCE, id: wardId },
          {
            demPct: entry.demPct,
            repPct: entry.repPct,
            margin: entry.margin,
            totalVotes: entry.totalVotes,
            isEstimate: entry.isEstimate,
          },
        );
      }
      const elapsed = performance.now() - start;
      console.log(`setFeatureState: ${Object.keys(data.data).length} wards in ${elapsed.toFixed(0)}ms`);
    }

    prevMapDataRef.current = data ?? null;
  }, []);

  // Add/update GeoJSON source when boundaries load
  useEffect(() => {
    const m = map.current;
    if (!m || !boundariesGeoJSON) return;

    const addLayers = () => {
      if (boundariesAdded.current) return;

      m.addSource(WARD_SOURCE, {
        type: 'geojson',
        data: boundariesGeoJSON,
        promoteId: 'ward_id',
      });

      // Choropleth fill layer
      m.addLayer({
        id: WARD_LAYER_FILL,
        type: 'fill',
        source: WARD_SOURCE,
        paint: {
          'fill-color': choroplethFillColor,
          'fill-opacity': 0.75,
        },
      });

      // Ward boundary lines
      m.addLayer({
        id: WARD_LAYER_LINE,
        type: 'line',
        source: WARD_SOURCE,
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

      boundariesAdded.current = true;

      // Apply any mapData that arrived before boundaries were ready
      if (mapData) {
        applyMapData(m, mapData);
      }
    };

    if (mapLoaded.current) {
      addLayers();
    } else {
      m.on('load', addLayers);
    }
  }, [boundariesGeoJSON, mapData, applyMapData]);

  // Apply election data via setFeatureState
  useEffect(() => {
    const m = map.current;
    if (!m || !boundariesAdded.current) return;
    applyMapData(m, mapData);
  }, [mapData, applyMapData]);

  // Update selected ward highlight
  useEffect(() => {
    const m = map.current;
    if (!m || !boundariesAdded.current) return;

    // Clear previous selection
    if (prevSelectedRef.current) {
      m.setFeatureState(
        { source: WARD_SOURCE, id: prevSelectedRef.current },
        { selected: false },
      );
    }

    if (selectedWardId) {
      m.setFeatureState(
        { source: WARD_SOURCE, id: selectedWardId },
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

    const handleMove = (e: maplibregl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: [WARD_LAYER_FILL],
      });

      // Clear previous hover
      if (hoveredId) {
        m.setFeatureState(
          { source: WARD_SOURCE, id: hoveredId },
          { hovered: false },
        );
      }

      if (features.length > 0) {
        const feature = features[0];
        const wardId = feature.properties?.ward_id;
        if (wardId) {
          hoveredId = wardId;
          m.setFeatureState(
            { source: WARD_SOURCE, id: wardId },
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
          { source: WARD_SOURCE, id: hoveredId },
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

  return (
    <div
      ref={mapContainer}
      className="h-full w-full"
      style={{ minHeight: '400px' }}
    />
  );
}
