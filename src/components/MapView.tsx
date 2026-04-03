import { useState, useCallback, useEffect, useRef } from 'react';
import { Map, useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, MapViewState } from '@deck.gl/core';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Entry, Era } from '../types';
import type { MapLabelLevel } from '../styles/era-themes';
import { getEraForYear } from '../utils/timeWindow';
import EraOverlay from './EraOverlay';
import { formatYear } from '../utils/formatUtils';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 20,
  latitude: 35,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

function DeckGLOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl(() => new MapboxOverlay({ layers, interleaved: true }));
  useEffect(() => {
    overlay.setProps({ layers });
  }, [overlay, layers]);
  return null;
}

/**
 * Apply label visibility to the Mapbox map based on era.
 * - 'none': hide all text labels (pure geographic map)
 * - 'minimal': show only continent/ocean labels, hide countries/cities
 * - 'full': show all labels normally
 */
function applyLabelLevel(map: mapboxgl.Map, level: MapLabelLevel) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    const id = layer.id;

    if (level === 'none') {
      // Hide all text labels
      map.setLayoutProperty(id, 'visibility', 'none');
    } else if (level === 'minimal') {
      // Show only large geographic labels (continents, oceans, seas)
      const isGeo = /continent|ocean|sea|water-label/i.test(id);
      map.setLayoutProperty(id, 'visibility', isGeo ? 'visible' : 'none');
    } else {
      // full — show everything
      map.setLayoutProperty(id, 'visibility', 'visible');
    }
  }
}

interface MapViewProps {
  currentYear: number;
  eras: Era[];
  layers?: Layer[];
  hoveredEntry?: Entry | null;
  mapStyle?: string;
  mapLabels?: MapLabelLevel;
  onViewStateChange?: (viewState: MapViewState) => void;
  onYearChange?: (year: number) => void;
  children?: React.ReactNode;
}

export default function MapView({
  currentYear,
  eras,
  layers = [],
  hoveredEntry,
  mapStyle = 'mapbox://styles/mapbox/light-v11',
  mapLabels = 'full',
  onViewStateChange,
  onYearChange,
  children,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      setViewState(evt.viewState);
      onViewStateChange?.(evt.viewState);
    },
    [onViewStateChange],
  );

  // Apply label visibility when mapLabels changes or map style reloads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    // Style may still be loading after a style switch — wait for idle
    const apply = () => applyLabelLevel(map, mapLabels);
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('idle', apply);
    }
  }, [mapLabels, mapLoaded, mapStyle]);

  const styleTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const handleStyleData = useCallback(() => {
    // Re-apply labels after every style load (style switch triggers this)
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
      styleTimerRef.current = setTimeout(() => applyLabelLevel(map, mapLabels), 50);
    }
  }, [mapLabels]);
  useEffect(() => () => { if (styleTimerRef.current) clearTimeout(styleTimerRef.current); }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (!onYearChange) return;

      const era = getEraForYear(currentYear, eras);
      const sensitivity = era.windowWidth / 200;
      const delta = e.deltaY * sensitivity;

      const minYear = eras[0]?.start ?? 0;
      const maxYear = eras[eras.length - 1]?.end ?? 2025;
      const newYear = Math.max(minYear, Math.min(maxYear, currentYear + delta));

      onYearChange(newYear);
    },
    [currentYear, eras, onYearChange],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    setPointerPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      role="application"
      aria-label="Interactive timeline map"
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
    >
      {/* Map container with era-driven CSS filter for visual theming */}
      <div
        style={{
          width: '100%',
          height: '100%',
          filter: 'var(--map-filter, none)',
          transition: 'filter 800ms ease-in-out',
        }}
      >
        <Map
          ref={mapRef}
          {...viewState}
          onMove={handleMove}
          onLoad={() => setMapLoaded(true)}
          onStyleData={handleStyleData}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle}
          projection={{ name: 'mercator' }}
          style={{ width: '100%', height: '100%' }}
        >
          <DeckGLOverlay layers={layers} />
          {children}
        </Map>
      </div>

      <EraOverlay currentYear={currentYear} eras={eras} />

      {hoveredEntry && (
        <div
          style={{
            position: 'fixed',
            left: pointerPos.x + 12,
            top: pointerPos.y - 28,
            background: 'var(--chrome-bg, rgba(20, 20, 30, 0.92))',
            color: 'var(--chrome-text, #fff)',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.3,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{hoveredEntry.title}</div>
          <div style={{ opacity: 0.7, fontSize: 11 }}>
            {formatYear(hoveredEntry.year)}
          </div>
        </div>
      )}
    </div>
  );
}
