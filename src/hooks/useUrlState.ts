import { useEffect, useRef } from 'react';
import type { Subject } from '../types';
import type { AppState, AppStateActions, AppStateInit } from './useAppState';

const ALL_SUBJECTS: Subject[] = [
  'mathematics',
  'physics',
  'chemistry',
  'medicine-biology',
  'inventions-engineering',
  'astronomy-cosmology',
  'philosophy-logic',
];

const VALID_SUBJECTS = new Set<string>(ALL_SUBJECTS);

/**
 * Parse the URL hash into initial app state values.
 * Format: #/year/{year}/entry/{entryId}/subjects/{subjectList}
 * Handles negative years (e.g., #/year/-300).
 */
export function parseHash(hash: string): AppStateInit {
  const result: AppStateInit = {};

  if (!hash || hash === '#') return result;

  // Remove leading #
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  const segments = path.split('/').filter(Boolean);

  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === 'year' && i + 1 < segments.length) {
      // Handle negative years: if next segment starts with '-', it's a negative number
      const yearStr = segments[i + 1];
      const parsed = parseInt(yearStr, 10);
      if (!isNaN(parsed)) {
        result.year = parsed;
      }
      i++;
    } else if (segments[i] === 'entry' && i + 1 < segments.length) {
      const entryId = segments[i + 1];
      if (entryId && entryId !== 'null') {
        result.selectedEntryId = entryId;
      }
      i++;
    } else if (segments[i] === 'subjects' && i + 1 < segments.length) {
      const subjectStr = segments[i + 1];
      if (subjectStr === 'all') {
        result.enabledSubjects = [...ALL_SUBJECTS];
      } else if (subjectStr === 'none') {
        result.enabledSubjects = [];
      } else {
        result.enabledSubjects = subjectStr
          .split(',')
          .filter((s) => VALID_SUBJECTS.has(s)) as Subject[];
      }
      i++;
    }
  }

  return result;
}

function buildHash(state: AppState): string {
  const parts: string[] = ['#'];
  parts.push(`/year/${state.currentYear}`);

  if (state.selectedEntryId) {
    parts.push(`/entry/${state.selectedEntryId}`);
  }

  const enabledArr = ALL_SUBJECTS.filter((s) => state.enabledSubjects.has(s));
  if (enabledArr.length === ALL_SUBJECTS.length) {
    // All subjects enabled — omit from URL for cleanliness
  } else if (enabledArr.length === 0) {
    parts.push('/subjects/none');
  } else {
    parts.push(`/subjects/${enabledArr.join(',')}`);
  }

  return parts.join('');
}

/**
 * Sync app state to/from URL hash.
 * On mount: parses hash for initial values (via parseHash, called before useAppState).
 * On state change: updates the hash (debounced 300ms).
 */
export function useUrlState(state: AppState, actions: AppStateActions): void {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state -> URL hash (debounced)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const newHash = buildHash(state);
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [state]);

  // Listen for popstate / hashchange to sync URL -> state
  useEffect(() => {
    function onHashChange() {
      const parsed = parseHash(window.location.hash);
      if (parsed.year !== undefined) {
        actions.setYear(parsed.year);
      }
      if (parsed.selectedEntryId !== undefined) {
        actions.selectEntry(parsed.selectedEntryId);
      }
    }

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [actions]);
}
