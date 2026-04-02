import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEpochlightData } from './hooks/useEpochlightData';
import { useAppState } from './hooks/useAppState';
import { useUrlState, parseHash } from './hooks/useUrlState';
import MapView from './components/MapView';
import ScrubberBar from './components/ScrubberBar';
import SidePanel from './components/SidePanel';
import OnboardingTooltips from './components/OnboardingTooltips';
import ControlPanel from './components/ControlPanel';
import AriaAnnouncer from './components/AriaAnnouncer';
import HistoryTicker from './components/HistoryTicker';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import EmptyState from './components/EmptyState';
import { createEntryLayers } from './layers/EntryLayer';
import { createEntryCardLayers } from './layers/EntryCardLayer';
import { createConnectionLayers } from './layers/ConnectionLayer';
import { createHistoryLayers } from './layers/HistoryLayer';
import { getEntryOpacity, getWindowWidth } from './utils/timeWindow';
import { useEraTheme } from './hooks/useEraTheme';
import { useLocale } from './hooks/useLocale';
import { useTranslatedEntries } from './hooks/useTranslatedEntries';
import { trackEvent } from './utils/analytics';
import type { Entry, Subject } from './types';
import type { MapViewState } from '@deck.gl/core';

const initialUrlState = parseHash(window.location.hash);

export default function App() {
  const { data, loading, error, refetch } = useEpochlightData();
  const { locale } = useLocale();
  const appState = useAppState(initialUrlState);
  const [hoveredEntry, setHoveredEntry] = useState<Entry | null>(null);
  const [zoom, setZoom] = useState(2);
  const [pulseTime, setPulseTime] = useState(0);
  const rafRef = useRef<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Track scrubbing: set true on year change, reset after 500ms idle
  const prevYearRef = useRef(appState.state.currentYear);
  useEffect(() => {
    if (appState.state.currentYear !== prevYearRef.current) {
      prevYearRef.current = appState.state.currentYear;
      setIsScrubbing(true);
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
      scrubTimerRef.current = setTimeout(() => setIsScrubbing(false), 500);
    }
    return () => { if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current); };
  }, [appState.state.currentYear]);

  // Animate pulse when an entry is selected
  useEffect(() => {
    if (!appState.state.selectedEntryId) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const animate = () => {
      setPulseTime(performance.now());
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [appState.state.selectedEntryId]);

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
  const eraTheme = useEraTheme(appState.state.currentYear, data?.meta.eras ?? []);

  // Apply content translations (lazy-loaded for non-English locales)
  const translatedEntries = useTranslatedEntries(data?.entries ?? [], locale);

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

  const visibleHistoryCount = useMemo(() => {
    if (!data || !appState.state.showContextLayer) return 0;
    const w = getWindowWidth(appState.state.currentYear, data.meta.eras);
    return data.entries.filter((e) => {
      if (e.subject !== 'world-history') return false;
      return getEntryOpacity(e.year, appState.state.currentYear, w) > 0;
    }).length;
  }, [data, appState.state.currentYear, appState.state.showContextLayer]);

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
    pulseTime,
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

  const historyLayers = createHistoryLayers({
    entries: data.entries,
    currentYear: appState.state.currentYear,
    eras: data.meta.eras,
    showContextLayer: appState.state.showContextLayer,
    selectedEntryId: appState.state.selectedEntryId,
    onEntryClick: handleEntryClick,
    onEntryHover: handleEntryHover,
    zoom,
  });

  const allLayers = [...connectionLayers, ...historyLayers, ...entryLayers, ...entryCardLayers];

  const selectedEntry = appState.state.selectedEntryId
    ? translatedEntries.find((e) => e.id === appState.state.selectedEntryId) ?? null
    : null;

  return (
    <>
      <MapView
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
        layers={allLayers}
        hoveredEntry={hoveredEntry}
        mapStyle={eraTheme.mapStyle}
        mapLabels={eraTheme.mapLabels}
        onViewStateChange={handleViewStateChange}
        onYearChange={appState.setYear}
      />
      <ControlPanel
        enabledSubjects={appState.state.enabledSubjects}
        onToggleSubject={appState.toggleSubject}
        onEnableAll={appState.enableAllSubjects}
        onDisableAll={appState.disableAllSubjects}
        showContextLayer={appState.state.showContextLayer}
        onToggleContextLayer={appState.toggleContextLayer}
        visibleHistoryCount={visibleHistoryCount}
        entries={translatedEntries}
        onNavigate={handleNavigateToEntry}
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
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
      <HistoryTicker
        entries={translatedEntries}
        currentYear={appState.state.currentYear}
        eras={data.meta.eras}
        showContextLayer={appState.state.showContextLayer}
        isInteracting={isScrubbing || hoveredEntry !== null}
        sidePanelOpen={selectedEntry !== null}
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
