import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Entry } from '../types';
import { SUBJECT_COLORS } from '../types';
import { searchEntries } from '../utils/search';
import { trackEvent } from '../utils/analytics';
import { useLocale } from '../hooks/useLocale';

interface SearchBarProps {
  entries: Entry[];
  onNavigate: (entryId: string, year: number) => void;
}

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

export default function SearchBar({ entries, onNavigate }: SearchBarProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchEntries(debouncedQuery, entries),
    [debouncedQuery, entries],
  );

  const showDropdown = isOpen && query.trim().length > 0;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (entry: Entry) => {
      trackEvent('search_performed', { query_length: query.length });
      onNavigate(entry.id, entry.year);
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onNavigate, query.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('');
        setDebouncedQuery('');
        setIsOpen(false);
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
    },
    [showDropdown, results, activeIndex, handleSelect],
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const listboxId = 'search-results-listbox';

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper}>
        <svg
          style={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          aria-label={t('aria.searchLabel')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          style={styles.input}
        />
      </div>

      {showDropdown && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          style={styles.dropdown}
        >
          {results.length === 0 ? (
            <li style={styles.emptyState}>{t('search.empty')}</li>
          ) : (
            results.map((entry, i) => (
              <li
                key={entry.id}
                id={`search-result-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                style={{
                  ...styles.resultItem,
                  backgroundColor:
                    i === activeIndex
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'transparent',
                }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(entry);
                }}
              >
                <span
                  style={{
                    ...styles.dot,
                    backgroundColor: SUBJECT_COLORS[entry.subject],
                  }}
                />
                <span style={styles.resultTitle}>{entry.title}</span>
                <span style={styles.resultYear}>{formatYear(entry.year)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 1000,
    width: 320,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: 10,
    color: 'var(--chrome-muted, rgba(255, 255, 255, 0.6))',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '8px 12px 8px 34px',
    background: 'var(--chrome-bg, rgba(0, 0, 0, 0.7))',
    border: '1px solid var(--chrome-border, rgba(255, 255, 255, 0.2))',
    borderRadius: 8,
    color: 'var(--chrome-text, #fff)',
    fontSize: 14,
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'background 800ms ease-in-out, border-color 800ms ease-in-out, color 800ms ease-in-out',
  },
  dropdown: {
    margin: 0,
    marginTop: 4,
    padding: 0,
    listStyle: 'none',
    background: 'var(--chrome-bg, rgba(0, 0, 0, 0.85))',
    border: '1px solid var(--chrome-border, rgba(255, 255, 255, 0.15))',
    borderRadius: 8,
    maxHeight: 320,
    overflowY: 'auto' as const,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  emptyState: {
    padding: '12px 14px',
    color: 'var(--chrome-muted, rgba(255, 255, 255, 0.5))',
    fontSize: 13,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  resultTitle: {
    flex: 1,
    color: 'var(--chrome-text, #fff)',
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  resultYear: {
    color: 'var(--chrome-muted, rgba(255, 255, 255, 0.5))',
    fontSize: 12,
    flexShrink: 0,
  },
};
