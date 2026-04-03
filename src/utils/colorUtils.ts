import type { Entry, Subject } from '../types';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Zoom breakpoints for the dot/card crossfade (zoom 4–6). */
const CROSSFADE_MIN = 4;
const CROSSFADE_MAX = 6;

/** Dot opacity: full at zoom <= 4, fading out to 0 at zoom >= 6. */
export function getDotOpacityAtZoom(zoom: number): number {
  return Math.max(0, Math.min(1, (CROSSFADE_MAX - zoom) / (CROSSFADE_MAX - CROSSFADE_MIN)));
}

/** Card/label opacity: 0 at zoom <= 4, fading in to full at zoom >= 6. */
export function getCardOpacityAtZoom(zoom: number): number {
  return Math.max(0, Math.min(1, (zoom - CROSSFADE_MIN) / (CROSSFADE_MAX - CROSSFADE_MIN)));
}

export function isEntryVisible(entry: Entry, enabledSubjects: Set<Subject>): boolean {
  if (enabledSubjects.has(entry.subject)) return true;
  return entry.secondary_subjects.some((s) => enabledSubjects.has(s));
}
