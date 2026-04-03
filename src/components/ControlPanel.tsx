import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Entry, Era, Subject } from '../types';
import { SUBJECT_COLORS } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';
import { searchEntries } from '../utils/search';
import { trackEvent } from '../utils/analytics';
import { useLocale, LOCALE_LABELS, type Locale } from '../hooks/useLocale';
import { FILTERABLE_SUBJECTS, SUBJECT_LOCALE_KEYS } from '../constants/subjects';
import { formatYear } from '../utils/formatUtils';
import './ControlPanel.css';

const LOCALES = Object.keys(LOCALE_LABELS) as Locale[];

interface ControlPanelProps {
  // Subject filters
  enabledSubjects: Set<Subject>;
  onToggleSubject: (subject: Subject) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  // History toggle
  showContextLayer: boolean;
  onToggleContextLayer: () => void;
  visibleHistoryCount: number;
  // Search
  entries: Entry[];
  onNavigate: (entryId: string, year: number) => void;
  // Time context (for counts)
  currentYear: number;
  eras: Era[];
}

export default function ControlPanel({
  enabledSubjects,
  onToggleSubject,
  onEnableAll,
  onDisableAll,
  showContextLayer,
  onToggleContextLayer,
  visibleHistoryCount,
  entries,
  onNavigate,
  currentYear,
  eras,
}: ControlPanelProps) {
  const { t, locale, setLocale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const windowWidth = getWindowWidth(currentYear, eras);

  const visibleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of FILTERABLE_SUBJECTS) counts[subject] = 0;
    for (const entry of entries) {
      const opacity = getEntryOpacity(entry.year, currentYear, windowWidth);
      if (opacity > 0) counts[entry.subject] = (counts[entry.subject] || 0) + 1;
    }
    return counts;
  }, [entries, currentYear, windowWidth]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchEntries(debouncedQuery, entries),
    [debouncedQuery, entries],
  );

  const showDropdown = searchOpen && query.trim().length > 0;

  useEffect(() => { setActiveIndex(-1); }, [results]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // "/" keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = useCallback((entry: Entry) => {
    trackEvent('search_performed', { query_length: query.length });
    onNavigate(entry.id, entry.year);
    setQuery('');
    setDebouncedQuery('');
    setSearchOpen(false);
    inputRef.current?.blur();
  }, [onNavigate, query.length]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      setDebouncedQuery('');
      setSearchOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  }, [showDropdown, results, activeIndex, handleSelect]);

  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const enabledCount = enabledSubjects.size;
  const listboxId = 'cp-search-results';

  return (
    <div ref={panelRef} className={`cp${expanded ? ' cp--expanded' : ''}`}>
      {/* --- Collapsed bar: hamburger + search --- */}
      <div className="cp__bar">
        <button
          className="cp__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Toggle control panel"
          aria-expanded={expanded}
        >
          ≡
        </button>
        <div className="cp__search-wrap">
          <svg className="cp__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `cp-result-${activeIndex}` : undefined}
            aria-label={t('aria.searchLabel')}
            placeholder={t('search.placeholder')}
            className="cp__search-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      {/* --- Search dropdown (always available, even when panel collapsed) --- */}
      {showDropdown && (
        <ul ref={listboxRef} id={listboxId} role="listbox" className="cp__dropdown">
          {results.length === 0 ? (
            <li className="cp__dropdown-empty">{t('search.empty')}</li>
          ) : (
            results.map((entry, i) => (
              <li
                key={entry.id}
                id={`cp-result-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`cp__dropdown-item${i === activeIndex ? ' cp__dropdown-item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(entry); }}
              >
                <span className="cp__dropdown-dot" style={{ backgroundColor: SUBJECT_COLORS[entry.subject] }} />
                <span className="cp__dropdown-title">{entry.title}</span>
                <span className="cp__dropdown-year">{formatYear(entry.year)}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {/* --- Expanded body --- */}
      <div className="cp__body">
        {/* Subjects */}
        <div className="cp__section-label">{t('subjects.header')} {enabledCount}/{FILTERABLE_SUBJECTS.length}</div>
        <ul className="cp__subject-list">
          {FILTERABLE_SUBJECTS.map((subject) => {
            const enabled = enabledSubjects.has(subject);
            return (
              <li
                key={subject}
                className={`cp__subject${enabled ? '' : ' cp__subject--off'}`}
                role="switch"
                aria-checked={enabled}
                tabIndex={0}
                onClick={() => {
                  trackEvent('subject_toggled', { subject, enabled: !enabled ? 1 : 0 });
                  onToggleSubject(subject);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    trackEvent('subject_toggled', { subject, enabled: !enabled ? 1 : 0 });
                    onToggleSubject(subject);
                  }
                }}
              >
                <span className="cp__subject-dot" style={{ backgroundColor: SUBJECT_COLORS[subject] }} />
                <span className="cp__subject-label">{t(SUBJECT_LOCALE_KEYS[subject])}</span>
                <span className="cp__subject-count">{visibleCounts[subject]}</span>
              </li>
            );
          })}
        </ul>
        <div className="cp__shortcuts">
          <button className="cp__shortcut-btn" onClick={() => onEnableAll()}>{t('subjects.enableAll')}</button>
          <button className="cp__shortcut-btn" onClick={() => onDisableAll()}>{t('subjects.disableAll')}</button>
        </div>

        <div className="cp__divider" />

        {/* History context toggle */}
        <div
          className={`cp__history-toggle${showContextLayer ? '' : ' cp__history-toggle--off'}`}
          role="switch"
          aria-checked={showContextLayer}
          tabIndex={0}
          onClick={onToggleContextLayer}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleContextLayer(); }
          }}
        >
          <span className="cp__history-icon">✦</span>
          <span className="cp__history-label">{t('historyToggle.label')}</span>
          {showContextLayer && visibleHistoryCount > 0 && (
            <span className="cp__history-count">{visibleHistoryCount}</span>
          )}
        </div>

        <div className="cp__divider" />

        {/* Language */}
        <div className="cp__lang-row">
          {LOCALES.map((l) => (
            <button
              key={l}
              className={`cp__lang-btn${l === locale ? ' cp__lang-btn--active' : ''}`}
              onClick={() => setLocale(l)}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
