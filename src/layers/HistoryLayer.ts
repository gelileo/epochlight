import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Entry, Era } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';
import { getHistoryIconAtlas } from '../utils/historyIconAtlas';

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

// Flame palette for glow/pulse effects and icon tinting
const FLAME_OUTER: [number, number, number] = [224, 80, 32];
const FLAME_INNER: [number, number, number] = [255, 180, 60];

const ICON_SIZE = 36;

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

  const { atlasUrl, mapping } = getHistoryIconAtlas();
  const layers: Layer[] = [];

  // --- Category icons ---
  layers.push(
    new IconLayer<Entry>({
      id: 'history-icons',
      data: historyEntries,
      iconAtlas: atlasUrl,
      iconMapping: mapping,
      getIcon: (d) => d.category ?? 'culture',
      getPosition: (d) => [d.lng, d.lat],
      getSize: (d) => {
        const base = ICON_SIZE;
        return d.id === selectedEntryId ? base * 1.3 : base;
      },
      getColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
        // White = no tint, colors are baked into the atlas per category
        return [255, 255, 255, Math.round(opacity * zoomOpacity * 255)] as [number, number, number, number];
      },
      sizeUnits: 'pixels' as const,
      pickable: true,
      onClick: (info) => {
        if (info.object) onEntryClick(info.object.id);
      },
      onHover: (info) => {
        onEntryHover(info.object ?? null);
      },
      updateTriggers: {
        getIcon: [entries],
        getSize: [selectedEntryId],
        getColor: [currentYear, selectedEntryId, zoom],
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
          const base = ICON_SIZE * 1.3;
          return base * (1.0 + pulsePhase * 0.8);
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
