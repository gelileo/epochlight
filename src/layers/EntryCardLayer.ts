import { TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Entry, Era, Subject } from '../types';
import { SUBJECT_COLORS } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

interface EntryCardLayerProps {
  entries: Entry[];
  currentYear: number;
  eras: Era[];
  enabledSubjects: Set<Subject>;
  selectedEntryId: string | null;
  onEntryClick: (entryId: string) => void;
  onEntryHover: (entry: Entry | null) => void;
  zoom: number;
}

const MEDIA_HINT_ICONS: Record<string, string> = {
  portrait: '\u{1F464}',
  diagram: '\u{1F4D0}',
  artifact_photo: '\u{1F3FA}',
  illustration: '\u{1F3A8}',
  manuscript: '\u{1F4DC}',
  map: '\u{1F5FA}',
};

const DEFAULT_ICON = '\u{1F4A1}';

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

function getMediaIcon(mediaHint: Entry['media_hint']): string {
  if (mediaHint && MEDIA_HINT_ICONS[mediaHint]) {
    return MEDIA_HINT_ICONS[mediaHint];
  }
  return DEFAULT_ICON;
}

/**
 * Card opacity crossfade: invisible at zoom <= 4, fading in from 4 to 6, full at zoom >= 6.
 * Formula: cardOpacityMultiplier = clamp((zoom - 4) / 2, 0, 1)
 */
function getCardOpacityMultiplier(zoom: number): number {
  return Math.max(0, Math.min(1, (zoom - 4) / 2));
}

export function createEntryCardLayers(props: EntryCardLayerProps): Layer[] {
  const {
    entries,
    currentYear,
    eras,
    enabledSubjects,
    selectedEntryId,
    onEntryClick,
    onEntryHover,
    zoom,
  } = props;

  const cardOpacity = getCardOpacityMultiplier(zoom);

  // Don't create layers if fully transparent
  if (cardOpacity <= 0) return [];

  const windowWidth = getWindowWidth(currentYear, eras);

  const visibleEntries = entries.filter((entry) => {
    if (!isEntryVisible(entry, enabledSubjects)) return false;
    const isSelected = entry.id === selectedEntryId;
    if (isSelected) return true;
    const opacity = getEntryOpacity(entry.year, currentYear, windowWidth);
    return opacity > 0;
  });

  const textLayer = new TextLayer<Entry>({
    id: 'entry-card-text',
    data: visibleEntries,
    getPosition: (d) => [d.lng, d.lat],
    getText: (d) => `${getMediaIcon(d.media_hint)} ${d.title}`,
    getSize: 13,
    getColor: (d) => {
      const isSelected = d.id === selectedEntryId;
      const entryOpacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      const alpha = Math.round(entryOpacity * cardOpacity * 255);
      return [255, 255, 255, alpha] as [number, number, number, number];
    },
    getPixelOffset: [0, -18],
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 'bold',
    outlineWidth: 3,
    outlineColor: [15, 15, 25, 200],
    sizeUnits: 'pixels' as const,
    sizeScale: 1,
    billboard: true,
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
      getText: [],
      getColor: [currentYear, selectedEntryId, zoom],
    },
  });

  // Background halo layer using subject color
  const haloLayer = new TextLayer<Entry>({
    id: 'entry-card-halo',
    data: visibleEntries,
    getPosition: (d) => [d.lng, d.lat],
    getText: (d) => `${getMediaIcon(d.media_hint)} ${d.title}`,
    getSize: 13,
    getColor: (d) => {
      const rgb = hexToRgb(SUBJECT_COLORS[d.subject]);
      const isSelected = d.id === selectedEntryId;
      const entryOpacity = isSelected
        ? 1.0
        : getEntryOpacity(d.year, currentYear, windowWidth);
      const alpha = Math.round(entryOpacity * cardOpacity * 0.6 * 255);
      return [...rgb, alpha] as [number, number, number, number];
    },
    getPixelOffset: [0, -18],
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 'bold',
    outlineWidth: 6,
    outlineColor: [10, 10, 20, 180],
    sizeUnits: 'pixels' as const,
    sizeScale: 1,
    billboard: true,
    pickable: false,
    updateTriggers: {
      getText: [],
      getColor: [currentYear, selectedEntryId, zoom],
    },
  });

  return [haloLayer, textLayer];
}
