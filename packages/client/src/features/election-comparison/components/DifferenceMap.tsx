import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { diffChoroplethFillColor, DIFF_LEGEND_BINS } from '@/shared/lib/diffColorScale';
import type { DiffMapData } from '../hooks/useComparisonData';

const WISCONSIN_CENTER: [number, number] = [-87.95, 43.04];
const WISCONSIN_BOUNDS: [[number, number], [number, number]] = [
  [-93.0, 42.3],
  [-86.7, 47.2],
];

const WARD_SOURCE = 'wards';
const WARD_SOURCE_LAYER = 'wards';
const WARD_LAYER_FILL = 'ward-fills';
const WARD_LAYER_LINE = 'ward-lines';

let protocolAdded = false;

interface DifferenceMapProps {
  diffData: DiffMapData | null;
}

export function DifferenceMap({ diffData }: DifferenceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const layersAdded = useRef(false);
  const prevDiffRef = useRef<DiffMapData | null>(null);

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
          { id: 'background', type: 'background', paint: { 'background-color': '#f0f0f0' } },
        ],
      },
      center: WISCONSIN_CENTER,
      zoom: 9,
      maxBounds: WISCONSIN_BOUNDS,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    m.on('load', () => {
      mapLoaded.current = true;

      m.addSource(WARD_SOURCE, {
        type: 'vector',
        url: 'pmtiles:///tiles/wards.pmtiles',
        promoteId: { [WARD_SOURCE_LAYER]: 'ward_id' },
      });

      m.addLayer({
        id: WARD_LAYER_FILL,
        type: 'fill',
        source: WARD_SOURCE,
        'source-layer': WARD_SOURCE_LAYER,
        paint: {
          'fill-color': diffChoroplethFillColor,
          'fill-opacity': 0.75,
        },
      });

      m.addLayer({
        id: WARD_LAYER_LINE,
        type: 'line',
        source: WARD_SOURCE,
        'source-layer': WARD_SOURCE_LAYER,
        paint: {
          'line-color': '#666',
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.1, 10, 0.5, 14, 1],
          'line-opacity': 0.4,
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

  const applyDiffData = useCallback((m: maplibregl.Map, data: DiffMapData | null) => {
    if (prevDiffRef.current) {
      for (const wardId of Object.keys(prevDiffRef.current.data)) {
        m.removeFeatureState({ source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId });
      }
    }
    if (data) {
      for (const [wardId, entry] of Object.entries(data.data)) {
        m.setFeatureState(
          { source: WARD_SOURCE, sourceLayer: WARD_SOURCE_LAYER, id: wardId },
          { diffMargin: entry.diffMargin },
        );
      }
    }
    prevDiffRef.current = data;
  }, []);

  // Apply diff data via setFeatureState once layers are ready
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (layersAdded.current) {
      applyDiffData(m, diffData);
    } else {
      const onLoad = () => applyDiffData(m, diffData);
      m.on('load', onLoad);
      return () => { m.off('load', onLoad); };
    }
  }, [diffData, applyDiffData]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" style={{ minHeight: '400px' }} />

      {/* Diff Legend */}
      <div className="glass-panel absolute bottom-6 left-4 z-20 rounded-lg p-3">
        <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
          <span>Shifted R</span>
          <span>Shifted D</span>
        </div>
        <div className="flex">
          {DIFF_LEGEND_BINS.map((bin) => (
            <div key={bin.label} className="flex-1">
              <div
                className="h-4 border border-white/50"
                style={{ backgroundColor: bin.color }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>R+20</span>
          <span>0</span>
          <span>D+20</span>
        </div>
        {diffData && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            Avg shift: {diffData.avgDiff > 0 ? 'D' : 'R'}+{Math.abs(diffData.avgDiff).toFixed(1)}
            {' '}({diffData.wardCount.toLocaleString()} wards)
          </div>
        )}
      </div>
    </div>
  );
}
