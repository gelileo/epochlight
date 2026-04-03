import { ScatterplotLayer } from '@deck.gl/layers';
import type { Entry, Era, Subject } from '../types';
import { SUBJECT_COLORS } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

interface EntryLayerProps {
  entries: Entry[];
  currentYear: number;
  eras: Era[];
  enabledSubjects: Set<Subject>;
  selectedEntryId: string | null;
  onEntryClick: (entryId: string) => void;
  onEntryHover: (entry: Entry | null) => void;
  zoom?: number;
  pulseTime?: number;
  windowWidthOverride?: number;
}

/**
 * Dot opacity crossfade: full at zoom <= 4, fading out from 4 to 6, hidden at zoom >= 6.
 * Formula: dotOpacityMultiplier = clamp((6 - zoom) / 2, 0, 1)
 */
function getDotOpacityMultiplier(zoom: number): number {
  return Math.max(0, Math.min(1, (6 - zoom) / 2));
}

const TIER_RADIUS: Record<1 | 2 | 3, number> = {
  1: 12,
  2: 8,
  3: 5,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function isEntryVisible(entry: Entry, enabledSubjects: Set<Subject>): boolean {
  if (enabledSubjects.has(entry.subject)) return true;
  return entry.secondary_subjects.some((s) => enabledSubjects.has(s));
}

export function createEntryLayers(props: EntryLayerProps): ScatterplotLayer[] {
  const {
    entries,
    currentYear,
    eras,
    enabledSubjects,
    selectedEntryId,
    onEntryClick,
    onEntryHover,
    zoom = 2,
    pulseTime = 0,
    windowWidthOverride,
  } = props;

  const dotOpacityMultiplier = getDotOpacityMultiplier(zoom);

  // Don't create layers if fully transparent
  if (dotOpacityMultiplier <= 0) return [];

  const windowWidth = windowWidthOverride ?? getWindowWidth(currentYear, eras);

  const visibleEntries = entries.filter((entry) => {
    if (!isEntryVisible(entry, enabledSubjects)) return false;
    const isSelected = entry.id === selectedEntryId;
    if (isSelected) return true;
    const opacity = getEntryOpacity(entry.year, currentYear, windowWidth);
    return opacity > 0;
  });

  const glowLayer = new ScatterplotLayer<Entry>({
    id: 'entry-glow',
    data: visibleEntries,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier];
      const isSelected = d.id === selectedEntryId;
      return (isSelected ? base * 1.5 : base) * 2;
    },
    getFillColor: (d) => {
      const rgb = hexToRgb(SUBJECT_COLORS[d.subject]);
      const isSelected = d.id === selectedEntryId;
      const opacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      return [...rgb, Math.round(opacity * 0.3 * dotOpacityMultiplier * 255)] as [number, number, number, number];
    },
    radiusUnits: 'pixels' as const,
    pickable: false,
    updateTriggers: {
      getRadius: [selectedEntryId],
      getFillColor: [currentYear, selectedEntryId, zoom],
    },
  });

  const mainLayer = new ScatterplotLayer<Entry>({
    id: 'entry-main',
    data: visibleEntries,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier];
      return d.id === selectedEntryId ? base * 1.5 : base;
    },
    getFillColor: (d) => {
      const rgb = hexToRgb(SUBJECT_COLORS[d.subject]);
      const isSelected = d.id === selectedEntryId;
      const opacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      return [...rgb, Math.round(opacity * dotOpacityMultiplier * 255)] as [number, number, number, number];
    },
    // Tier 1 entries get a white stroke ring for colorblind differentiation
    stroked: true,
    getLineColor: (d) => {
      if (d.tier === 1) {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected
          ? 1.0
          : getEntryOpacity(d.year, currentYear, windowWidth);
        return [255, 255, 255, Math.round(opacity * dotOpacityMultiplier * 200)] as [number, number, number, number];
      }
      return [0, 0, 0, 0] as [number, number, number, number];
    },
    getLineWidth: (d) => (d.tier === 1 ? 2 : 0),
    lineWidthMinPixels: 0,
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
    ? visibleEntries.filter((e) => e.id === selectedEntryId)
    : [];

  const pulsePhase = (Math.sin(pulseTime * 0.004) + 1) / 2; // 0..1 oscillation
  const pulseLayer = new ScatterplotLayer<Entry>({
    id: 'entry-pulse',
    data: selectedEntry,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => {
      const base = TIER_RADIUS[d.tier] * 1.5;
      // Expand from 1.8x to 3x the selected radius
      return base * (1.8 + pulsePhase * 1.2);
    },
    getFillColor: [0, 0, 0, 0],
    stroked: true,
    getLineColor: (d) => {
      const rgb = hexToRgb(SUBJECT_COLORS[d.subject]);
      const alpha = Math.round((1 - pulsePhase) * 0.7 * dotOpacityMultiplier * 255);
      return [...rgb, alpha] as [number, number, number, number];
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
