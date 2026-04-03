import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { Entry, Era } from '../types';
import { SUBJECT_COLORS } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

interface ConnectionLayerProps {
  entries: Entry[];
  selectedEntryId: string | null;
  currentYear: number;
  eras: Era[];
  showKnowledgeFlow: boolean;
  onEntryClick: (entryId: string) => void;
  windowWidthOverride?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

interface ArcDatum {
  source: Entry;
  target: Entry;
  sourceColor: [number, number, number, number];
  targetColor: [number, number, number, number];
}

export function createConnectionLayers(props: ConnectionLayerProps): Layer[] {
  const {
    entries,
    selectedEntryId,
    currentYear,
    eras,
    showKnowledgeFlow,
    onEntryClick,
    windowWidthOverride,
  } = props;

  const windowWidth = windowWidthOverride ?? getWindowWidth(currentYear, eras);

  // Build entry lookup map
  const entryMap = new Map<string, Entry>();
  for (const entry of entries) {
    entryMap.set(entry.id, entry);
  }

  if (showKnowledgeFlow) {
    return createKnowledgeFlowLayers(entries, entryMap, currentYear, windowWidth);
  }

  if (!selectedEntryId) {
    return [];
  }

  return createSelectedEntryLayers(
    selectedEntryId,
    entryMap,
    currentYear,
    windowWidth,
    onEntryClick,
  );
}

function createSelectedEntryLayers(
  selectedEntryId: string,
  entryMap: Map<string, Entry>,
  currentYear: number,
  windowWidth: number,
  onEntryClick: (entryId: string) => void,
): Layer[] {
  const selectedEntry = entryMap.get(selectedEntryId);
  if (!selectedEntry) return [];

  const arcData: ArcDatum[] = [];
  const ghostEntries: Entry[] = [];

  for (const connRef of selectedEntry.connections) {
    const target = entryMap.get(connRef.id);
    if (!target) continue;

    const targetOpacity = getEntryOpacity(target.year, currentYear, windowWidth);
    const rgb = hexToRgb(SUBJECT_COLORS[target.subject]);
    const isGhost = targetOpacity === 0;

    if (isGhost) {
      ghostEntries.push(target);
      arcData.push({
        source: selectedEntry,
        target,
        sourceColor: [...rgb, Math.round(0.3 * 255)] as [number, number, number, number],
        targetColor: [...rgb, Math.round(0.3 * 255)] as [number, number, number, number],
      });
    } else {
      arcData.push({
        source: selectedEntry,
        target,
        sourceColor: [...rgb, 255] as [number, number, number, number],
        targetColor: [...rgb, 255] as [number, number, number, number],
      });
    }
  }

  const layers: Layer[] = [];

  if (arcData.length > 0) {
    layers.push(
      new ArcLayer<ArcDatum>({
        id: 'connection-arcs',
        data: arcData,
        getSourcePosition: (d) => [d.source.lng, d.source.lat],
        getTargetPosition: (d) => [d.target.lng, d.target.lat],
        getSourceColor: (d) => d.sourceColor,
        getTargetColor: (d) => d.targetColor,
        getWidth: 2,
        pickable: false,
        updateTriggers: {
          getSourceColor: [currentYear],
          getTargetColor: [currentYear],
        },
      }),
    );
  }

  if (ghostEntries.length > 0) {
    layers.push(
      new ScatterplotLayer<Entry>({
        id: 'connection-ghost-nodes',
        data: ghostEntries,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 4,
        getFillColor: (d) => {
          const rgb = hexToRgb(SUBJECT_COLORS[d.subject]);
          return [...rgb, Math.round(0.1 * 255)] as [number, number, number, number];
        },
        radiusUnits: 'pixels' as const,
        pickable: true,
        onClick: (info) => {
          if (info.object) {
            onEntryClick(info.object.id);
          }
        },
        updateTriggers: {
          getFillColor: [currentYear],
        },
      }),
    );
  }

  return layers;
}

function createKnowledgeFlowLayers(
  entries: Entry[],
  entryMap: Map<string, Entry>,
  currentYear: number,
  windowWidth: number,
): Layer[] {
  // Collect all connections between visible entries
  const arcData: ArcDatum[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const sourceOpacity = getEntryOpacity(entry.year, currentYear, windowWidth);
    if (sourceOpacity === 0) continue;

    for (const connRef of entry.connections) {
      // Deduplicate: use sorted pair of IDs
      const pairKey = [entry.id, connRef.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const target = entryMap.get(connRef.id);
      if (!target) continue;

      const targetOpacity = getEntryOpacity(target.year, currentYear, windowWidth);
      if (targetOpacity === 0) continue;

      // Determine chronological direction: earlier is brighter, later is dimmer
      const earlier = entry.year <= target.year ? entry : target;
      const later = entry.year <= target.year ? target : entry;

      const earlierRgb = hexToRgb(SUBJECT_COLORS[earlier.subject]);
      const laterRgb = hexToRgb(SUBJECT_COLORS[later.subject]);

      arcData.push({
        source: earlier,
        target: later,
        sourceColor: [...earlierRgb, Math.round(0.8 * 255)] as [number, number, number, number],
        targetColor: [...laterRgb, Math.round(0.3 * 255)] as [number, number, number, number],
      });
    }
  }

  if (arcData.length === 0) return [];

  return [
    new ArcLayer<ArcDatum>({
      id: 'knowledge-flow-arcs',
      data: arcData,
      getSourcePosition: (d) => [d.source.lng, d.source.lat],
      getTargetPosition: (d) => [d.target.lng, d.target.lat],
      getSourceColor: (d) => d.sourceColor,
      getTargetColor: (d) => d.targetColor,
      getWidth: 2,
      pickable: false,
      updateTriggers: {
        getSourceColor: [currentYear],
        getTargetColor: [currentYear],
      },
    }),
  ];
}
