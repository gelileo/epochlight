import { describe, it, expect } from 'vitest';
import { getEraForYear, getWindowWidth, getEntryOpacity } from './timeWindow';
import type { Era } from '../types';

const testEras: Era[] = [
  { id: 'ancient', label: 'Ancient', start: -3000, end: -500, style: 'warm', windowWidth: 200 },
  { id: 'classical', label: 'Classical', start: -499, end: 500, style: 'marble', windowWidth: 100 },
  { id: 'medieval', label: 'Medieval', start: 501, end: 1400, style: 'dark', windowWidth: 75 },
  { id: 'modern', label: 'Modern', start: 1401, end: 2025, style: 'bright', windowWidth: 25 },
];

describe('getEraForYear', () => {
  it('returns correct era for a year in the ancient era', () => {
    expect(getEraForYear(-2000, testEras)).toEqual(testEras[0]);
  });

  it('returns correct era for a year in the classical era', () => {
    expect(getEraForYear(0, testEras)).toEqual(testEras[1]);
  });

  it('returns correct era for a year in the medieval era', () => {
    expect(getEraForYear(1000, testEras)).toEqual(testEras[2]);
  });

  it('returns correct era for a year in the modern era', () => {
    expect(getEraForYear(1900, testEras)).toEqual(testEras[3]);
  });

  it('handles boundary year at start of era', () => {
    expect(getEraForYear(-3000, testEras)).toEqual(testEras[0]);
    expect(getEraForYear(-499, testEras)).toEqual(testEras[1]);
    expect(getEraForYear(501, testEras)).toEqual(testEras[2]);
    expect(getEraForYear(1401, testEras)).toEqual(testEras[3]);
  });

  it('handles boundary year at end of era', () => {
    expect(getEraForYear(-500, testEras)).toEqual(testEras[0]);
    expect(getEraForYear(500, testEras)).toEqual(testEras[1]);
    expect(getEraForYear(1400, testEras)).toEqual(testEras[2]);
    expect(getEraForYear(2025, testEras)).toEqual(testEras[3]);
  });

  it('returns first era for year before all eras', () => {
    expect(getEraForYear(-5000, testEras)).toEqual(testEras[0]);
  });

  it('returns last era for year after all eras', () => {
    expect(getEraForYear(3000, testEras)).toEqual(testEras[3]);
  });
});

describe('getWindowWidth', () => {
  it('returns window width for a year in each era', () => {
    expect(getWindowWidth(-2000, testEras)).toBe(200);
    expect(getWindowWidth(0, testEras)).toBe(100);
    expect(getWindowWidth(1000, testEras)).toBe(75);
    expect(getWindowWidth(1900, testEras)).toBe(25);
  });
});

describe('getEntryOpacity', () => {
  it('returns 1.0 for entries within the active zone (+/-W)', () => {
    expect(getEntryOpacity(100, 100, 50)).toBe(1.0);
    expect(getEntryOpacity(150, 100, 50)).toBe(1.0);
    expect(getEntryOpacity(50, 100, 50)).toBe(1.0);
  });

  it('returns 1.0 for entries exactly at window boundary', () => {
    expect(getEntryOpacity(150, 100, 50)).toBe(1.0);
    expect(getEntryOpacity(50, 100, 50)).toBe(1.0);
  });

  it('returns 0.2 for entries in the fade zone (W to 2W)', () => {
    expect(getEntryOpacity(160, 100, 50)).toBe(0.2);
    expect(getEntryOpacity(40, 100, 50)).toBe(0.2);
    expect(getEntryOpacity(199, 100, 50)).toBe(0.2);
  });

  it('returns 0.2 for entries exactly at 2W boundary', () => {
    expect(getEntryOpacity(200, 100, 50)).toBe(0.2);
    expect(getEntryOpacity(0, 100, 50)).toBe(0.2);
  });

  it('returns 0.0 for entries beyond the fade zone (>2W)', () => {
    expect(getEntryOpacity(201, 100, 50)).toBe(0.0);
    expect(getEntryOpacity(-1, 100, 50)).toBe(0.0);
    expect(getEntryOpacity(500, 100, 50)).toBe(0.0);
  });

  it('handles negative years correctly', () => {
    expect(getEntryOpacity(-300, -300, 100)).toBe(1.0);
    expect(getEntryOpacity(-200, -300, 100)).toBe(1.0);
    expect(getEntryOpacity(-150, -300, 100)).toBe(0.2);
    expect(getEntryOpacity(-50, -300, 100)).toBe(0.0);
  });
});
