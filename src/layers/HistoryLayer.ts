import { ScatterplotLayer } from '@deck.gl/layers';
import type { Entry, Era } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

interface HistoryLayerProps {
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

const BRONZE: [number, number, number] = [192, 149, 108]; // #C0956C

const TIER_RADIUS: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 7,
  3: 5,
};

/**
 * Dot opacity crossfade: full at zoom <= 4, fading out from 4 to 6, hidden at zoom >= 6.
 * Formula: dotOpacityMultiplier = clamp((6 - zoom) / 2, 0, 1)
 */
function getDotOpacityMultiplier(zoom: number): number {
  return Math.max(0, Math.min(1, (6 - zoom) / 2));
}

export function createHistoryLayers(props: HistoryLayerProps): ScatterplotLayer[] {
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

  const dotOpacityMultiplier = getDotOpacityMultiplier(zoom);

  // Don't create layers if fully transparent
  if (dotOpacityMultiplier <= 0) return [];

  const windowWidth = getWindowWidth(currentYear, eras);

  const historyEntries = entries.filter((entry) => {
    if (entry.subject !== 'world-history') return false;
    const isSelected = entry.id === selectedEntryId;
    if (isSelected) return true;
    const opacity = getEntryOpacity(entry.year, currentYear, windowWidth);
    return opacity > 0;
  });

  const glowLayer = new ScatterplotLayer<Entry>({
    id: 'history-glow',
    data: historyEntries,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier];
      const isSelected = d.id === selectedEntryId;
      return (isSelected ? base * 1.5 : base) * 2;
    },
    getFillColor: (d) => {
      const isSelected = d.id === selectedEntryId;
      const opacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      return [...BRONZE, Math.round(opacity * 0.3 * dotOpacityMultiplier * 255)] as [number, number, number, number];
    },
    radiusUnits: 'pixels' as const,
    pickable: false,
    updateTriggers: {
      getRadius: [selectedEntryId],
      getFillColor: [currentYear, selectedEntryId, zoom],
    },
  });

  const mainLayer = new ScatterplotLayer<Entry>({
    id: 'history-main',
    data: historyEntries,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier];
      return d.id === selectedEntryId ? base * 1.5 : base;
    },
    getFillColor: (d) => {
      const isSelected = d.id === selectedEntryId;
      const opacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      return [...BRONZE, Math.round(opacity * dotOpacityMultiplier * 255)] as [number, number, number, number];
    },
    stroked: true,
    getLineColor: (d) => {
      const isSelected = d.id === selectedEntryId;
      const opacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      return [...BRONZE, Math.round(opacity * dotOpacityMultiplier * 200)] as [number, number, number, number];
    },
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    radiusUnits: 'pixels' as const,
    pickable: true,
    onClick: (info) => {
      if (info.object) {
        onEntryClick(info.object.id);
      }
    },
    onHover: (info) => {
      onEntryHover(info.object ?? null);
    },
    updateTriggers: {
      getRadius: [selectedEntryId],
      getFillColor: [currentYear, selectedEntryId, zoom],
      getLineColor: [currentYear, selectedEntryId, zoom],
    },
  });

  // Pulse ring around the selected entry
  const selectedEntry = selectedEntryId
    ? historyEntries.filter((e) => e.id === selectedEntryId)
    : [];

  const pulsePhase = (Math.sin(pulseTime * 0.004) + 1) / 2; // 0..1 oscillation
  const pulseLayer = new ScatterplotLayer<Entry>({
    id: 'history-pulse',
    data: selectedEntry,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier] * 1.5;
      // Expand from 1.8x to 3x the selected radius
      return base * (1.8 + pulsePhase * 1.2);
    },
    getFillColor: [0, 0, 0, 0],
    stroked: true,
    getLineColor: () => {
      const alpha = Math.round((1 - pulsePhase) * 0.7 * dotOpacityMultiplier * 255);
      return [...BRONZE, alpha] as [number, number, number, number];
    },
    getLineWidth: 2,
    lineWidthMinPixels: 1.5,
    radiusUnits: 'pixels' as const,
    pickable: false,
    updateTriggers: {
      getRadius: [pulseTime, selectedEntryId],
      getLineColor: [pulseTime, selectedEntryId, zoom],
    },
  });

  return [pulseLayer, glowLayer, mainLayer];
}
