import type { Era } from '../types';

/**
 * Find which era a year falls in.
 * If the year is before all eras, returns the first era.
 * If the year is after all eras, returns the last era.
 */
export function getEraForYear(year: number, eras: Era[]): Era {
  for (const era of eras) {
    if (year >= era.start && year <= era.end) {
      return era;
    }
  }
  // Fallback: return closest era
  if (year < eras[0].start) return eras[0];
  return eras[eras.length - 1];
}

/**
 * Get the window width for a year (from the era's windowWidth).
 */
export function getWindowWidth(year: number, eras: Era[]): number {
  return getEraForYear(year, eras).windowWidth;
}

/**
 * Calculate entry opacity based on distance from cursor.
 * Returns: 1.0 (within +/-W), 0.2 (within +/-2W), 0.0 (beyond +/-2W)
 */
export function getEntryOpacity(
  entryYear: number,
  cursorYear: number,
  windowWidth: number,
): number {
  const distance = Math.abs(entryYear - cursorYear);
  if (distance <= windowWidth) return 1.0;
  if (distance <= windowWidth * 2) return 0.2;
  return 0.0;
}
