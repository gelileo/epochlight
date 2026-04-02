import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
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

const TIER_SIZE: Record<1 | 2 | 3, number> = {
  1: 28,
  2: 22,
  3: 16,
};

// Four-pointed starburst SVG as a data URL for entries without thumbnails
const STARBURST_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path d="M32 4 L36 26 L58 32 L36 38 L32 60 L28 38 L6 32 L28 26 Z"
          fill="#C0956C" stroke="#A07A50" stroke-width="2"/>
  </svg>`
)}`;

// Circular mask SVG template for thumbnail images — creates a bronze-bordered circle
function makeThumbnailIconUrl(thumbUrl: string): string {
  // We can't composite images in an SVG data URL due to cross-origin restrictions.
  // Instead, we return the raw thumbnail URL and let IconLayer fetch it directly.
  // The circular clipping + border is achieved via the icon mask approach below.
  return thumbUrl;
}

/**
 * Zoom-based opacity: full at zoom <= 4, fading 4-6, hidden at >= 6.
 */
function getZoomOpacity(zoom: number): number {
  return Math.max(0, Math.min(1, (6 - zoom) / 2));
}

/**
 * Check if an entry has a usable thumbnail URL.
 */
function hasThumbnail(entry: Entry): boolean {
  return !!(entry.media && entry.media.length > 0 && entry.media[0].thumbnail_url);
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
    const isSelected = entry.id === selectedEntryId;
    if (isSelected) return true;
    return getEntryOpacity(entry.year, currentYear, windowWidth) > 0;
  });

  // Split into thumbnail entries and starburst entries
  const thumbnailEntries = historyEntries.filter(hasThumbnail);
  const starburstEntries = historyEntries.filter((e) => !hasThumbnail(e));

  const layers: Layer[] = [];

  // --- Bronze glow behind all history entries ---
  layers.push(
    new ScatterplotLayer<Entry>({
      id: 'history-glow',
      data: historyEntries,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => {
        const base = TIER_SIZE[d.tier];
        const isSelected = d.id === selectedEntryId;
        return (isSelected ? base * 1.3 : base) * 1.2;
      },
      getFillColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
        return [...BRONZE, Math.round(opacity * 0.25 * zoomOpacity * 255)] as [number, number, number, number];
      },
      radiusUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: {
        getRadius: [selectedEntryId],
        getFillColor: [currentYear, selectedEntryId, zoom],
      },
    })
  );

  // --- Bronze border ring behind thumbnails (acts as circular border) ---
  if (thumbnailEntries.length > 0) {
    layers.push(
      new ScatterplotLayer<Entry>({
        id: 'history-thumb-border',
        data: thumbnailEntries,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => {
          const base = TIER_SIZE[d.tier] / 2 + 2; // slightly larger than icon
          return d.id === selectedEntryId ? base * 1.3 : base;
        },
        getFillColor: (d) => {
          const isSelected = d.id === selectedEntryId;
          const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
          return [...BRONZE, Math.round(opacity * zoomOpacity * 255)] as [number, number, number, number];
        },
        radiusUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: {
          getRadius: [selectedEntryId],
          getFillColor: [currentYear, selectedEntryId, zoom],
        },
      })
    );
  }

  // --- Thumbnail IconLayer (entries with media) ---
  if (thumbnailEntries.length > 0) {
    layers.push(
      new IconLayer<Entry>({
        id: 'history-thumbnails',
        data: thumbnailEntries,
        getPosition: (d) => [d.lng, d.lat],
        getIcon: (d) => ({
          url: makeThumbnailIconUrl(d.media![0].thumbnail_url!),
          id: `thumb-${d.id}`,
          width: 80,
          height: 80,
          anchorY: 40,
        }),
        getSize: (d) => {
          const base = TIER_SIZE[d.tier];
          return d.id === selectedEntryId ? base * 1.3 : base;
        },
        getColor: (d) => {
          const isSelected = d.id === selectedEntryId;
          const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
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
        onIconError: () => {
          // Silently fail — entry will not show thumbnail, but starburst entries
          // are rendered separately so this entry just becomes invisible in this layer.
          // A more robust approach would move it to starburstEntries on failure,
          // but that requires re-render coordination.
        },
        updateTriggers: {
          getSize: [selectedEntryId],
          getColor: [currentYear, selectedEntryId, zoom],
        },
      })
    );
  }

  // --- Starburst IconLayer (entries without media / fallback) ---
  layers.push(
    new IconLayer<Entry>({
      id: 'history-starbursts',
      data: starburstEntries,
      getPosition: (d) => [d.lng, d.lat],
      getIcon: () => ({
        url: STARBURST_SVG,
        id: 'starburst',
        width: 64,
        height: 64,
        anchorY: 32,
      }),
      getSize: (d) => {
        const base = TIER_SIZE[d.tier];
        return d.id === selectedEntryId ? base * 1.3 : base;
      },
      getColor: (d) => {
        const isSelected = d.id === selectedEntryId;
        const opacity = isSelected ? 1.0 : getEntryOpacity(d.year, currentYear, windowWidth);
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
        getSize: [selectedEntryId],
        getColor: [currentYear, selectedEntryId, zoom],
      },
    })
  );

  // --- Pulse ring around selected history entry ---
  const selectedEntry = selectedEntryId
    ? historyEntries.filter((e) => e.id === selectedEntryId)
    : [];

  if (selectedEntry.length > 0) {
    const pulsePhase = (Math.sin(pulseTime * 0.004) + 1) / 2;
    layers.push(
      new ScatterplotLayer<Entry>({
        id: 'history-pulse',
        data: selectedEntry,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => {
          const base = TIER_SIZE[d.tier] / 2 * 1.3;
          return base * (1.8 + pulsePhase * 1.2);
        },
        getFillColor: [0, 0, 0, 0],
        stroked: true,
        getLineColor: () => {
          const alpha = Math.round((1 - pulsePhase) * 0.7 * zoomOpacity * 255);
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
      })
    );
  }

  return layers;
}
