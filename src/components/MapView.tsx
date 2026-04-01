import { useState, useCallback, useEffect } from 'react';
import { Map, useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, MapViewState } from '@deck.gl/core';
import type { Entry, Era } from '../types';
import { getEraForYear } from '../utils/timeWindow';
import EraOverlay from './EraOverlay';
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

interface MapViewProps {
  currentYear: number;
  eras: Era[];
  layers?: Layer[];
  hoveredEntry?: Entry | null;
  onViewStateChange?: (viewState: MapViewState) => void;
  onYearChange?: (year: number) => void;
}

export default function MapView({
  currentYear,
  eras,
  layers = [],
  hoveredEntry,
  onViewStateChange,
  onYearChange,
}: MapViewProps) {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      setViewState(evt.viewState);
      onViewStateChange?.(evt.viewState);
    },
    [onViewStateChange],
  );

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

  const formatYear = (year: number) => {
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year} CE`;
  };

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
          {...viewState}
          onMove={handleMove}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
          projection={{ name: 'mercator' }}
          style={{ width: '100%', height: '100%' }}
        >
          <DeckGLOverlay layers={layers} />
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
