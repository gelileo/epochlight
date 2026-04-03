import type { Subject } from '../types';

/** The 7 science subjects that appear as toggleable filters in the UI. */
export const FILTERABLE_SUBJECTS: Subject[] = [
  'mathematics',
  'physics',
  'chemistry',
  'medicine-biology',
  'inventions-engineering',
  'astronomy-cosmology',
  'philosophy-logic',
];

/** All valid subjects in the data, including world-history (context layer). */
export const ALL_SUBJECTS: Subject[] = [...FILTERABLE_SUBJECTS, 'world-history'];

/** Locale key mapping for subject display names. */
export const SUBJECT_LOCALE_KEYS: Record<string, string> = {
  mathematics: 'subjects.mathematics',
  physics: 'subjects.physics',
  chemistry: 'subjects.chemistry',
  'medicine-biology': 'subjects.medicineBiology',
  'inventions-engineering': 'subjects.inventionsEngineering',
  'astronomy-cosmology': 'subjects.astronomyCosmology',
  'philosophy-logic': 'subjects.philosophyLogic',
  'world-history': 'subjects.worldHistory',
};
