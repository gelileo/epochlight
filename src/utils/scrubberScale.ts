import type { Era, Entry } from '../types';

export interface EraSegment {
  era: Era;
  startPx: number;
  endPx: number;
  /** true if this segment is an adjacent-era overlap region (grayed out) */
  isOverlap?: boolean;
}

export type ScrubberZoom =
  | { mode: 'overview' }
  | { mode: 'era'; eraId: string };

const MIN_ERA_WIDTH = 80;
/** Fraction of adjacent eras shown at edges when zoomed */
const OVERLAP_FRACTION = 0.10;

/**
 * Count entries that fall within each era's year range.
 */
function countEntriesPerEra(eras: Era[], entries: Entry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const era of eras) {
    counts.set(era.id, 0);
  }
  for (const entry of entries) {
    for (const era of eras) {
      if (entry.year >= era.start && entry.year <= era.end) {
        counts.set(era.id, (counts.get(era.id) ?? 0) + 1);
        break;
      }
    }
  }
  return counts;
}

/**
 * Returns the pixel ranges for each era segment.
 * Each era gets pixels proportional to its entry count, with a minimum of MIN_ERA_WIDTH px.
 */
export function getEraSegments(
  eras: Era[],
  totalWidth: number,
  entries: Entry[],
): EraSegment[] {
  if (eras.length === 0) return [];

  const counts = countEntriesPerEra(eras, entries);
  const totalEntries = entries.length || 1;

  // First pass: compute raw proportional widths, enforce minimum
  const rawWidths = eras.map((era) => {
    const count = counts.get(era.id) ?? 0;
    return (count / totalEntries) * totalWidth;
  });

  // Count how many eras need the minimum and how much space that consumes
  const minCount = rawWidths.filter((w) => w < MIN_ERA_WIDTH).length;
  const reservedForMins = minCount * MIN_ERA_WIDTH;
  const remainingWidth = Math.max(0, totalWidth - reservedForMins);

  // Sum of raw widths for eras that exceed the minimum
  const sumAboveMin = rawWidths.reduce(
    (sum, w) => sum + (w >= MIN_ERA_WIDTH ? w : 0),
    0,
  );

  // Second pass: assign final widths
  const widths = rawWidths.map((w) => {
    if (w < MIN_ERA_WIDTH) return MIN_ERA_WIDTH;
    if (sumAboveMin === 0) return remainingWidth / eras.length;
    return (w / sumAboveMin) * remainingWidth;
  });

  // Build segments
  const segments: EraSegment[] = [];
  let x = 0;
  for (let i = 0; i < eras.length; i++) {
    const w = widths[i];
    segments.push({ era: eras[i], startPx: x, endPx: x + w });
    x += w;
  }

  return segments;
}

/**
 * Maps a year to a pixel position on the scrubber bar.
 * Within each era segment, time is linear.
 */
export function yearToPixel(
  year: number,
  eras: Era[],
  totalWidth: number,
  entries: Entry[],
): number {
  const segments = getEraSegments(eras, totalWidth, entries);
  if (segments.length === 0) return 0;

  // Clamp to overall range
  const minYear = eras[0].start;
  const maxYear = eras[eras.length - 1].end;

  if (year <= minYear) return segments[0].startPx;
  if (year >= maxYear) return segments[segments.length - 1].endPx;

  for (const seg of segments) {
    if (year >= seg.era.start && year <= seg.era.end) {
      const eraSpan = seg.era.end - seg.era.start;
      if (eraSpan === 0) return seg.startPx;
      const t = (year - seg.era.start) / eraSpan;
      return seg.startPx + t * (seg.endPx - seg.startPx);
    }
  }

  // Year falls between eras (gap) - find the closest segment
  for (let i = 0; i < segments.length - 1; i++) {
    if (year > segments[i].era.end && year < segments[i + 1].era.start) {
      return segments[i].endPx;
    }
  }

  return 0;
}

/**
 * Maps a pixel position back to a year.
 */
export function pixelToYear(
  pixel: number,
  eras: Era[],
  totalWidth: number,
  entries: Entry[],
): number {
  const segments = getEraSegments(eras, totalWidth, entries);
  if (segments.length === 0) return 0;

  // Clamp pixel
  if (pixel <= segments[0].startPx) return eras[0].start;
  if (pixel >= segments[segments.length - 1].endPx) return eras[eras.length - 1].end;

  for (const seg of segments) {
    if (pixel >= seg.startPx && pixel <= seg.endPx) {
      const pxSpan = seg.endPx - seg.startPx;
      if (pxSpan === 0) return seg.era.start;
      const t = (pixel - seg.startPx) / pxSpan;
      return seg.era.start + t * (seg.era.end - seg.era.start);
    }
  }

  return eras[eras.length - 1].end;
}

// ---------------------------------------------------------------------------
// Zoomed-era scale functions
// ---------------------------------------------------------------------------

/**
 * When zoomed into a single era, return segments for that era (filling most of
 * the bar) plus ±10% overlap of adjacent eras at the edges.
 */
export function getZoomedEraSegments(
  eras: Era[],
  totalWidth: number,
  zoomedEraId: string,
): EraSegment[] {
  const eraIdx = eras.findIndex((e) => e.id === zoomedEraId);
  if (eraIdx === -1) return [];

  const era = eras[eraIdx];
  const prevEra = eraIdx > 0 ? eras[eraIdx - 1] : null;
  const nextEra = eraIdx < eras.length - 1 ? eras[eraIdx + 1] : null;

  const overlapPx = totalWidth * OVERLAP_FRACTION;
  const leftOverlapPx = prevEra ? overlapPx : 0;
  const rightOverlapPx = nextEra ? overlapPx : 0;

  const segments: EraSegment[] = [];

  // Left overlap (previous era's tail)
  if (prevEra) {
    segments.push({
      era: prevEra,
      startPx: 0,
      endPx: leftOverlapPx,
      isOverlap: true,
    });
  }

  // Main zoomed era
  segments.push({
    era,
    startPx: leftOverlapPx,
    endPx: totalWidth - rightOverlapPx,
  });

  // Right overlap (next era's head)
  if (nextEra) {
    segments.push({
      era: nextEra,
      startPx: totalWidth - rightOverlapPx,
      endPx: totalWidth,
      isOverlap: true,
    });
  }

  return segments;
}

/**
 * Year → pixel in zoomed mode.
 * The overlap regions only show a fraction of the adjacent era's year range.
 */
export function zoomedYearToPixel(
  year: number,
  eras: Era[],
  totalWidth: number,
  zoomedEraId: string,
): number {
  const segments = getZoomedEraSegments(eras, totalWidth, zoomedEraId);
  if (segments.length === 0) return 0;

  for (const seg of segments) {
    const { yearStart, yearEnd } = getSegmentYearRange(seg);
    if (year >= yearStart && year <= yearEnd) {
      const t = yearEnd === yearStart ? 0 : (year - yearStart) / (yearEnd - yearStart);
      return seg.startPx + t * (seg.endPx - seg.startPx);
    }
  }

  // Clamp to edges
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const { yearStart: firstYear } = getSegmentYearRange(firstSeg);
  const { yearEnd: lastYear } = getSegmentYearRange(lastSeg);
  if (year < firstYear) return firstSeg.startPx;
  return lastSeg.endPx;
}

/**
 * Pixel → year in zoomed mode.
 */
export function zoomedPixelToYear(
  pixel: number,
  eras: Era[],
  totalWidth: number,
  zoomedEraId: string,
): number {
  const segments = getZoomedEraSegments(eras, totalWidth, zoomedEraId);
  if (segments.length === 0) return 0;

  for (const seg of segments) {
    if (pixel >= seg.startPx && pixel <= seg.endPx) {
      const pxSpan = seg.endPx - seg.startPx;
      const t = pxSpan === 0 ? 0 : (pixel - seg.startPx) / pxSpan;
      const { yearStart, yearEnd } = getSegmentYearRange(seg);
      return yearStart + t * (yearEnd - yearStart);
    }
  }

  const lastSeg = segments[segments.length - 1];
  const { yearEnd } = getSegmentYearRange(lastSeg);
  return yearEnd;
}

/**
 * For overlap segments, only show the tail/head fraction of the era.
 * For the main segment, show the full era range.
 */
function getSegmentYearRange(seg: EraSegment): { yearStart: number; yearEnd: number } {
  const eraSpan = seg.era.end - seg.era.start;
  if (!seg.isOverlap) {
    return { yearStart: seg.era.start, yearEnd: seg.era.end };
  }
  // Overlap: if this segment is before the main era, show the tail
  // If after, show the head. We detect by checking if startPx is 0.
  if (seg.startPx === 0) {
    // Left overlap — show tail of previous era
    const overlapYears = eraSpan * OVERLAP_FRACTION * 3;
    return { yearStart: seg.era.end - overlapYears, yearEnd: seg.era.end };
  }
  // Right overlap — show head of next era
  const overlapYears = eraSpan * OVERLAP_FRACTION * 3;
  return { yearStart: seg.era.start, yearEnd: seg.era.start + overlapYears };
}
