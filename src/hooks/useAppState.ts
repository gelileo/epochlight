import { useCallback, useState } from 'react';
import type { Subject } from '../types';
import { trackEvent } from '../utils/analytics';

const ALL_SUBJECTS: Subject[] = [
  'mathematics',
  'physics',
  'chemistry',
  'medicine-biology',
  'inventions-engineering',
  'astronomy-cosmology',
  'philosophy-logic',
];

export interface AppState {
  currentYear: number;
  selectedEntryId: string | null;
  enabledSubjects: Set<Subject>;
  showKnowledgeFlow: boolean;
  showContextLayer: boolean;
}

export interface AppStateActions {
  setYear: (year: number) => void;
  selectEntry: (id: string | null) => void;
  toggleSubject: (subject: Subject) => void;
  enableAllSubjects: () => void;
  disableAllSubjects: () => void;
  toggleKnowledgeFlow: () => void;
  toggleContextLayer: () => void;
}

export interface AppStateResult extends AppStateActions {
  state: AppState;
}

export interface AppStateInit {
  year?: number;
  selectedEntryId?: string | null;
  enabledSubjects?: Subject[];
  showContextLayer?: boolean;
}

export function useAppState(init?: AppStateInit): AppStateResult {
  const [state, setState] = useState<AppState>(() => ({
    currentYear: init?.year ?? 1,
    selectedEntryId: init?.selectedEntryId ?? null,
    enabledSubjects: init?.enabledSubjects
      ? new Set(init.enabledSubjects)
      : new Set(ALL_SUBJECTS),
    showKnowledgeFlow: false,
    showContextLayer: init?.showContextLayer ?? true,
  }));

  const setYear = useCallback((year: number) => {
    setState((prev) => ({ ...prev, currentYear: year }));
  }, []);

  const selectEntry = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedEntryId: id }));
  }, []);

  const toggleSubject = useCallback((subject: Subject) => {
    setState((prev) => {
      const next = new Set(prev.enabledSubjects);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return { ...prev, enabledSubjects: next };
    });
  }, []);

  const enableAllSubjects = useCallback(() => {
    setState((prev) => ({ ...prev, enabledSubjects: new Set(ALL_SUBJECTS) }));
  }, []);

  const disableAllSubjects = useCallback(() => {
    setState((prev) => ({ ...prev, enabledSubjects: new Set<Subject>() }));
  }, []);

  const toggleKnowledgeFlow = useCallback(() => {
    setState((prev) => {
      const enabled = !prev.showKnowledgeFlow;
      trackEvent('knowledge_flow_toggled', { enabled: enabled ? 1 : 0 });
      return { ...prev, showKnowledgeFlow: enabled };
    });
  }, []);

  const toggleContextLayer = useCallback(() => {
    setState((prev) => {
      const enabled = !prev.showContextLayer;
      trackEvent('context_layer_toggled', { enabled: enabled ? 1 : 0 });
      return { ...prev, showContextLayer: enabled };
    });
  }, []);

  return {
    state,
    setYear,
    selectEntry,
    toggleSubject,
    enableAllSubjects,
    disableAllSubjects,
    toggleKnowledgeFlow,
    toggleContextLayer,
  };
}
