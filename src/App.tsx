import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEpochlightData } from './hooks/useEpochlightData';
import { useAppState } from './hooks/useAppState';
import { useUrlState, parseHash } from './hooks/useUrlState';
import MapView from './components/MapView';
import ScrubberBar from './components/ScrubberBar';
import SidePanel from './components/SidePanel';
import OnboardingTooltips from './components/OnboardingTooltips';
import SubjectPills from './components/SubjectPills';
import SearchBar from './components/SearchBar';
import AriaAnnouncer from './components/AriaAnnouncer';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import EmptyState from './components/EmptyState';
import { createEntryLayers } from './layers/EntryLayer';
import { createEntryCardLayers } from './layers/EntryCardLayer';
import { createConnectionLayers } from './layers/ConnectionLayer';
import { getEntryOpacity, getWindowWidth } from './utils/timeWindow';
import { useEraTheme } from './hooks/useEraTheme';
import { trackEvent } from './utils/analytics';
import type { Entry, Subject } from './types';
import type { MapViewState } from '@deck.gl/core';

const initialUrlState = parseHash(window.location.hash);

export default function App() {
  const { data, loading, error, refetch } = useEpochlightData();
  const appState = useAppState(initialUrlState);
  const [hoveredEntry, setHoveredEntry] = useState<Entry | null>(null);
  const [zoom, setZoom] = useState(2);

  const handleViewStateChange = useCallback((viewState: MapViewState) => {
    setZoom(viewState.zoom);
  }, []);

  useUrlState(appState.state, appState);

  const handleEntryClick = useCallback(
    (entryId: string) => {
      if (data) {
        const entry = data.entries.find((e) => e.id === entryId);
        if (entry) {
          trackEvent('entry_selected', { id: entry.id, subject: entry.subject, tier: entry.tier });
        }
      }
      appState.selectEntry(entryId);
    },
    [appState.selectEntry, data],
  );

  const handleGhostNodeClick = useCallback(
    (entryId: string) => {
      if (data) {
        const entry = data.entries.find((e) => e.id === entryId);
        if (entry) {
          appState.setYear(entry.year);
        }
      }
      appState.selectEntry(entryId);
    },
    [appState.selectEntry, appState.setYear, data],
  );

  const handleEntryHover = useCallback((entry: Entry | null) => {
    setHoveredEntry(entry);
  }, []);

  // Escape key closes the side panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && appState.state.selectedEntryId) {
        appState.selectEntry(null);
        document.body.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState.state.selectedEntryId, appState.selectEntry]);

  const handleSidePanelClose = useCallback(() => {
    appState.selectEntry(null);
    document.body.focus();
  }, [appState.selectEntry]);

  const handleNavigateToEntry = useCallback(
    (entryId: string, _year: number) => {
      if (data) {
        const target = data.entries.find((e) => e.id === entryId);
        if (target) {
          appState.setYear(target.year);
        }
      }
      if (appState.state.selectedEntryId) {
        trackEvent('connection_followed', { from_id: appState.state.selectedEntryId, to_id: entryId });
      }
      appState.selectEntry(entryId);
    },
    [appState.selectEntry, appState.setYear, appState.state.selectedEntryId, data],
  );

  // Apply era-adaptive visual theme (CSS custom properties on :root)
  useEraTheme(appState.state.currentYear, data?.meta.eras ?? []);

  // Compute empty state flags (must be before early returns so hooks aren't conditional)
  const allSubjectsDisabled = appState.state.enabledSubjects.size === 0;
  const noEntriesInWindow = useMemo(() => {
    if (!data || allSubjectsDisabled) return false;
    const w = getWindowWidth(appState.state.currentYear, data.meta.eras);
    return !data.entries.some((entry) => {
      const opacity = getEntryOpacity(entry.year, appState.state.currentYear, w);
      if (opacity <= 0) return false;
      const subjects = appState.state.enabledSubjects;
      return (
        subjects.has(entry.subject) ||
        entry.secondary_subjects.some((s: Subject) => subjects.has(s))
      );
    });
  }, [data, appState.state.currentYear, appState.state.enabledSubjects, allSubjectsDisabled]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen onRetry={refetch} />;
  }

  if (!data) {
    return <ErrorScreen onRetry={refetch} />;
  }

  const entryLayers = createEntryLayers({
    entries: data.entries,
    currentYear: appState.state.currentYear,
    eras: data.meta.eras,
    enabledSubjects: appState.state.enabledSubjects,
    selectedEntryId: appState.state.selectedEntryId,
    onEntryClick: handleEntryClick,
    onEntryHover: handleEntryHover,
    zoom,
  });

  const entryCardLayers = createEntryCardLayers({
    entries: data.entries,
    currentYear: appState.state.currentYear,
    eras: data.meta.eras,
    enabledSubjects: appState.state.enabledSubjects,
    selectedEntryId: appState.state.selectedEntryId,
    onEntryClick: handleEntryClick,
    onEntryHover: handleEntryHover,
    zoom,
  });

  const connectionLayers = createConnectionLayers({
    entries: data.entries,
    selectedEntryId: appState.state.selectedEntryId,
    currentYear: appState.state.currentYear,
    eras: data.meta.eras,
    showKnowledgeFlow: appState.state.showKnowledgeFlow,
    onEntryClick: handleGhostNodeClick,
  });

  const allLayers = [...connectionLayers, ...entryLayers, ...entryCardLayers];

  const selectedEntry = appState.state.selectedEntryId
    ? data.entries.find((e) => e.id === appState.state.selectedEntryId) ?? null
    : null;

  return (
    <>
      <MapView
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
        layers={allLayers}
        hoveredEntry={hoveredEntry}
        onViewStateChange={handleViewStateChange}
        onYearChange={appState.setYear}
      />
      <SubjectPills
        enabledSubjects={appState.state.enabledSubjects}
        onToggleSubject={appState.toggleSubject}
        onEnableAll={appState.enableAllSubjects}
        onDisableAll={appState.disableAllSubjects}
        entries={data.entries}
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
      />
      <SearchBar
        entries={data.entries}
        onNavigate={handleNavigateToEntry}
      />
      <ScrubberBar
        currentYear={appState.state.currentYear}
        onYearChange={appState.setYear}
        eras={data.meta.eras}
        entries={data.entries}
      />
      <SidePanel
        entry={selectedEntry}
        onClose={handleSidePanelClose}
        onNavigateToEntry={handleNavigateToEntry}
      />
      <EmptyState
        noEntriesInWindow={noEntriesInWindow}
        allSubjectsDisabled={allSubjectsDisabled}
      />
      <OnboardingTooltips />
      <AriaAnnouncer
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
        selectedEntry={selectedEntry}
      />
    </>
  );
}
