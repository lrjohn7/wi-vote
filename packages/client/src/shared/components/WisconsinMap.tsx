import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

const WISCONSIN_BOUNDS: [[number, number], [number, number]] = [
  [-92.9, 42.4], // SW corner
  [-86.8, 47.1], // NE corner
];

const WISCONSIN_CENTER: [number, number] = [-89.5, 44.5];

let protocolAdded = false;

export function WisconsinMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!protocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      protocolAdded = true;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#e8e8e8' },
          },
        ],
      },
      center: WISCONSIN_CENTER,
      zoom: 7,
      maxBounds: WISCONSIN_BOUNDS,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="h-full w-full"
      style={{ minHeight: '400px' }}
    />
  );
}
