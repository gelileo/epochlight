import type { Subject } from '../types';
import { SUBJECT_LOCALE_KEYS } from '../constants/subjects';

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(Math.round(year))} BCE`;
  return `${Math.round(year)} CE`;
}

export function formatSubject(subject: Subject): string {
  const key = SUBJECT_LOCALE_KEYS[subject] ?? subject;
  // Strip the 'subjects.' prefix for a plain English fallback
  return key.replace('subjects.', '').replace(/([A-Z])/g, ' $1').trim();
}
