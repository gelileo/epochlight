import { describe, it, expect } from 'vitest';
import { yearToPixel, pixelToYear, getEraSegments } from './scrubberScale';
import type { Era, Entry } from '../types';

function makeEntry(id: string, year: number): Entry {
  return {
    id,
    year,
    year_end: null,
    year_precision: 'exact',
    title: id,
    description: '',
    persons: [],
    attribution_note: null,
    lat: 0,
    lng: 0,
    civilization: [],
    subject: 'mathematics',
    secondary_subjects: [],
    tags: [],
    tier: 1,
    impact: '',
    media_hint: null,
    connections: [],
    superseded_by: null,
    references: [],
  };
}

const eras: Era[] = [
  { id: 'ancient', label: 'Ancient', start: -3000, end: -500, style: 'aged-stone', windowWidth: 500 },
  { id: 'classical', label: 'Classical', start: -500, end: 500, style: 'marble', windowWidth: 200 },
  { id: 'modern', label: 'Modern', start: 500, end: 2000, style: 'clean', windowWidth: 50 },
];

// 5 ancient, 5 classical, 40 modern => modern should get more pixels
const entries: Entry[] = [
  ...Array.from({ length: 5 }, (_, i) => makeEntry(`a${i}`, -2000 + i * 100)),
  ...Array.from({ length: 5 }, (_, i) => makeEntry(`c${i}`, -200 + i * 100)),
  ...Array.from({ length: 40 }, (_, i) => makeEntry(`m${i}`, 600 + i * 30)),
];

const TOTAL_WIDTH = 1000;

describe('getEraSegments', () => {
  it('returns one segment per era', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    expect(segs).toHaveLength(3);
  });

  it('each era gets at least 80px', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    for (const seg of segs) {
      expect(seg.endPx - seg.startPx).toBeGreaterThanOrEqual(80);
    }
  });

  it('entry-dense eras get more pixels than sparse ones', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    const ancientWidth = segs[0].endPx - segs[0].startPx;
    const modernWidth = segs[2].endPx - segs[2].startPx;
    // Modern has 40 entries vs Ancient's 5
    expect(modernWidth).toBeGreaterThan(ancientWidth);
  });

  it('segments are contiguous', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startPx).toBeCloseTo(segs[i - 1].endPx, 5);
    }
  });

  it('total width approximately matches', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    const lastEnd = segs[segs.length - 1].endPx;
    expect(lastEnd).toBeCloseTo(TOTAL_WIDTH, 0);
  });
});

describe('yearToPixel and pixelToYear round-trip', () => {
  const testYears = [-3000, -2000, -500, 0, 500, 1000, 1500, 2000];

  for (const year of testYears) {
    it(`round-trips year ${year} within 1 year`, () => {
      const px = yearToPixel(year, eras, TOTAL_WIDTH, entries);
      const roundTripped = pixelToYear(px, eras, TOTAL_WIDTH, entries);
      expect(Math.abs(roundTripped - year)).toBeLessThanOrEqual(1);
    });
  }
});

describe('boundary years', () => {
  it('first era start maps to pixel 0', () => {
    const px = yearToPixel(-3000, eras, TOTAL_WIDTH, entries);
    expect(px).toBeCloseTo(0, 1);
  });

  it('last era end maps to approximately totalWidth', () => {
    const px = yearToPixel(2000, eras, TOTAL_WIDTH, entries);
    expect(px).toBeCloseTo(TOTAL_WIDTH, 0);
  });

  it('era boundaries are consistent between segments', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, entries);
    // End of ancient = start of classical in pixels
    const ancientEndPx = segs[0].endPx;
    const classicalStartPx = segs[1].startPx;
    expect(ancientEndPx).toBeCloseTo(classicalStartPx, 5);
  });
});

describe('edge cases', () => {
  it('handles empty eras', () => {
    const segs = getEraSegments([], TOTAL_WIDTH, entries);
    expect(segs).toHaveLength(0);
  });

  it('handles empty entries', () => {
    const segs = getEraSegments(eras, TOTAL_WIDTH, []);
    expect(segs).toHaveLength(3);
    // All eras should get at least minimum width
    for (const seg of segs) {
      expect(seg.endPx - seg.startPx).toBeGreaterThanOrEqual(80);
    }
  });

  it('handles single era', () => {
    const singleEra: Era[] = [
      { id: 'only', label: 'Only', start: 0, end: 100, style: 'clean', windowWidth: 10 },
    ];
    const singleEntries = [makeEntry('e1', 50)];
    const px = yearToPixel(50, singleEra, TOTAL_WIDTH, singleEntries);
    expect(px).toBeCloseTo(500, 0);
  });
});
