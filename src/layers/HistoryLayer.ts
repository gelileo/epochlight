import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Entry, Era } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

export interface HistoryLayerProps {
  entries: Entry[];
  currentYear: number;
  eras: Era[];
  showContextLayer: boolean;
  selectedEntryId: string | null;
  onEntryClick: (entryId: string) => void;
  onEntryHover: (entry: Entry | null) => void;
  zoom?: number;
  pulseTime?: number;
}

// Flame palette — visually distinct from science entry colors (blue/green/purple)
const FLAME_OUTER: [number, number, number] = [224, 80, 32];   // deep red-orange ring
const FLAME_INNER: [number, number, number] = [255, 180, 60];  // bright amber fill

const TIER_RADIUS: Record<1 | 2 | 3, number> = {
  1: 14,
  2: 10,
  3: 7,
};

function getZoomOpacity(zoom: number): number {
  return Math.max(0, Math.min(1, (6 - zoom) / 2));
}

export function createHistoryLayers(props: HistoryLayerProps): Layer[] {
  const {
    entries,
    currentYear,
    eras,
    showContextLayer,
    selectedEntryId,
    onEntryClick,
    onEntryHover,
    zoom = 2,
    pulseTime = 0,
  } = props;

  if (!showContextLayer) return [];

  const zoomOpacity = getZoomOpacity(zoom);
  if (zoomOpacity <= 0) return [];

  const windowWidth = getWindowWidth(currentYear, eras);

  const historyEntries = entries.filter((entry) => {
    if (entry.subject !== 'world-history') return false;
    if (entry.id === selectedEntryId) return true;
    return getEntryOpacity(entry.year, currentYear, windowWidth) > 0;
  });

  if (historyEntries.length === 0) return [];

  const layers: Layer[] = [];

  // --- Outer glow (soft flame halo) ---
  layers.push(
    new ScatterplotLayer<Entry>({
      id: 'history-glow',
      data: historyEntries,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => {
        const base = TIER_RADIUS[d.tier];
        return (d.id === selectedEntryId ? base * 1.4 : base) * 2.2;
      },
      getFillColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
        return [...FLAME_INNER, Math.round(opacity * 0.15 * zoomOpacity * 255)] as [number, number, number, number];
      },
      radiusUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: {
        getRadius: [selectedEntryId],
        getFillColor: [currentYear, selectedEntryId, zoom],
      },
    })
  );

  // --- Outer ring (deep red-orange border) ---
  layers.push(
    new ScatterplotLayer<Entry>({
      id: 'history-ring',
      data: historyEntries,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => {
        const base = TIER_RADIUS[d.tier];
        return d.id === selectedEntryId ? base * 1.4 : base;
      },
      getFillColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
        return [...FLAME_OUTER, Math.round(opacity * zoomOpacity * 255)] as [number, number, number, number];
      },
      radiusUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: {
        getRadius: [selectedEntryId],
        getFillColor: [currentYear, selectedEntryId, zoom],
      },
    })
  );

  // --- Inner fill (bright amber core, slightly smaller than ring) ---
  layers.push(
    new ScatterplotLayer<Entry>({
      id: 'history-core',
      data: historyEntries,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => {
        const base = TIER_RADIUS[d.tier] - 2.5;
        return d.id === selectedEntryId ? base * 1.4 : base;
      },
      getFillColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
        return [...FLAME_INNER, Math.round(opacity * zoomOpacity * 255)] as [number, number, number, number];
      },
      radiusUnits: 'pixels' as const,
      pickable: true,
      onClick: (info) => {
        if (info.object) onEntryClick(info.object.id);
      },
      onHover: (info) => {
        onEntryHover(info.object ?? null);
      },
      updateTriggers: {
        getRadius: [selectedEntryId],
        getFillColor: [currentYear, selectedEntryId, zoom],
      },
    })
  );

  // --- Pulse ring around selected ---
  const selectedArr = selectedEntryId
    ? historyEntries.filter((e) => e.id === selectedEntryId)
    : [];

  if (selectedArr.length > 0) {
    const pulsePhase = (Math.sin(pulseTime * 0.004) + 1) / 2;
    layers.push(
      new ScatterplotLayer<Entry>({
        id: 'history-pulse',
        data: selectedArr,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => {
          const base = TIER_RADIUS[d.tier] * 1.4;
          return base * (1.8 + pulsePhase * 1.2);
        },
        getFillColor: [0, 0, 0, 0],
        stroked: true,
        getLineColor: () => {
          const alpha = Math.round((1 - pulsePhase) * 0.7 * zoomOpacity * 255);
          return [...FLAME_OUTER, alpha] as [number, number, number, number];
        },
        getLineWidth: 2,
        lineWidthMinPixels: 1.5,
        radiusUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: {
          getRadius: [pulseTime, selectedEntryId],
          getLineColor: [pulseTime, selectedEntryId, zoom],
        },
      })
    );
  }

  return layers;
}
