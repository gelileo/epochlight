import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, Subject } from '../types';
import { SUBJECT_COLORS } from '../types';
import './SidePanel.css';

export interface SidePanelProps {
  entry: Entry | null;
  onClose: () => void;
  onNavigateToEntry: (entryId: string, year: number) => void;
}

const MEDIA_HINT_ICONS: Record<string, string> = {
  portrait: '\u{1F464}',
  diagram: '\u{1F4D0}',
  artifact_photo: '\u{1F3FA}',
  illustration: '\u{1F3A8}',
  manuscript: '\u{1F4DC}',
  map: '\u{1F5FA}\uFE0F',
};

const DEFAULT_ICON = '\u{1F4A1}';

function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}

function formatSubject(subject: string): string {
  return subject
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' / ');
}

function formatPersonYears(
  birth: number | null,
  death: number | null,
): string {
  if (birth != null && death != null) {
    return `${formatYear(birth)} \u2013 ${formatYear(death)}`;
  }
  if (birth != null) {
    return `b. ${formatYear(birth)}`;
  }
  if (death != null) {
    return `d. ${formatYear(death)}`;
  }
  return '';
}

export default function SidePanel({
  entry,
  onClose,
  onNavigateToEntry,
}: SidePanelProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = entry !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [translateVisible, setTranslateVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error state when entry changes
  useEffect(() => {
    setImageError(false);
  }, [entry?.id]);

  // Focus close button when panel opens
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
    if (!isOpen) {
      setMenuOpen(false);
    }
  }, [isOpen]);

  // Return focus to body when panel closes
  useEffect(() => {
    if (!isOpen) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }, [isOpen]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Toggle the Google Translate widget visibility
  useEffect(() => {
    const el = document.getElementById('google_translate_element');
    if (!el) return;
    if (translateVisible && isOpen) {
      el.classList.remove('gtranslate-hidden');
      el.classList.add('gtranslate-visible');
    } else {
      el.classList.remove('gtranslate-visible');
      el.classList.add('gtranslate-hidden');
    }
  }, [translateVisible, isOpen]);

  // Auto-hide translator when Google Translate is turned off
  // (Google adds/removes 'translated-*' class on <html>)
  useEffect(() => {
    if (!translateVisible) return;
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      const isTranslated = html.classList.contains('translated-ltr') ||
                           html.classList.contains('translated-rtl');
      if (!isTranslated) {
        setTranslateVisible(false);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [translateVisible]);

  const handleTranslateClick = useCallback(() => {
    setTranslateVisible((v) => !v);
    setMenuOpen(false);
  }, []);

  const icon = entry?.media_hint
    ? MEDIA_HINT_ICONS[entry.media_hint] ?? DEFAULT_ICON
    : DEFAULT_ICON;

  const subjectColor = entry
    ? SUBJECT_COLORS[entry.subject] ?? '#888'
    : '#888';

  return (
    <div className="side-panel-overlay" aria-hidden={!isOpen}>
      <div
        className={`side-panel${isOpen ? ' side-panel--open' : ''}`}
        role="complementary"
        aria-label="Entry detail"
      >
        {entry && (
          <>
            <div className="side-panel__toolbar">
              <div className="side-panel__menu-container" ref={menuRef}>
                <button
                  className="side-panel__menu-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div className="side-panel__menu-dropdown">
                    <button
                      className="side-panel__menu-item"
                      onClick={handleTranslateClick}
                    >
                      🌐 {translateVisible ? 'Hide Translator' : 'Translate Page'}
                    </button>
                  </div>
                )}
              </div>
              <button
                ref={closeBtnRef}
                className="side-panel__close"
                onClick={onClose}
                aria-label="Close panel"
              >
                &#x2715;
              </button>
            </div>
            <div className="side-panel__content">
              {entry.media && entry.media.length > 0 && !imageError && (
                <div className="side-panel__hero">
                  <img
                    className="side-panel__hero-img"
                    src={entry.media[0].url}
                    alt={entry.media[0].caption ?? entry.title}
                    onError={() => setImageError(true)}
                  />
                  {entry.media[0].caption && (
                    <div className="side-panel__hero-caption">
                      {entry.media[0].caption}
                    </div>
                  )}
                  {(entry.media[0].license || entry.media[0].source) && (
                    <div className="side-panel__hero-license">
                      {[entry.media[0].license, entry.media[0].source]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                </div>
              )}
              <div className="side-panel__header">
                {entry.subject === 'world-history' ? (
                  <span className="side-panel__context-label">
                    Historical Context
                  </span>
                ) : (
                  <span
                    className={`side-panel__tier-badge side-panel__tier-badge--${entry.tier}`}
                  >
                    Tier {entry.tier}
                  </span>
                )}
                <div className="side-panel__icon">{icon}</div>
                <h2 className="side-panel__title">{entry.title}</h2>
                <div className="side-panel__year">
                  {formatYear(entry.year)}
                  {entry.year_end != null &&
                    ` \u2013 ${formatYear(entry.year_end)}`}
                </div>
                <div
                  className="side-panel__subject"
                  style={{ color: subjectColor }}
                >
                  {formatSubject(entry.subject)}
                </div>
                {entry.civilization.length > 0 && (
                  <div className="side-panel__civilization">
                    {entry.civilization.join(' \u00B7 ')}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="side-panel__section">
                <p className="side-panel__description">{entry.description}</p>
              </div>

              {/* Impact */}
              {entry.impact && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">Impact</div>
                  <p className="side-panel__impact">{entry.impact}</p>
                </div>
              )}

              {/* Persons */}
              {(entry.persons.length > 0 || entry.attribution_note) && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">
                    {entry.persons.length > 0 ? 'People' : 'Attribution'}
                  </div>
                  {entry.persons.length > 0
                    ? entry.persons.map((person, idx) => (
                        <div key={idx} className="side-panel__person">
                          <div className="side-panel__person-name">
                            {person.name}
                          </div>
                          <div className="side-panel__person-detail">
                            {[
                              formatPersonYears(
                                person.birth_year,
                                person.death_year,
                              ),
                              person.region,
                            ]
                              .filter(Boolean)
                              .join(' \u2014 ')}
                          </div>
                        </div>
                      ))
                    : entry.attribution_note && (
                        <div className="side-panel__attribution">
                          {entry.attribution_note}
                        </div>
                      )}
                </div>
              )}

              {/* Connections */}
              {entry.connections.length > 0 && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">Connections</div>
                  {entry.connections.map((conn) => (
                    <div key={conn.id} className="side-panel__connection">
                      <span
                        className="side-panel__connection-dot"
                        style={{
                          backgroundColor:
                            SUBJECT_COLORS[conn.subject as Subject] ?? '#888',
                        }}
                      />
                      <div className="side-panel__connection-info">
                        <button
                          className="side-panel__connection-link"
                          onClick={() =>
                            onNavigateToEntry(conn.id, entry.year)
                          }
                        >
                          {conn.title}
                        </button>
                        <div className="side-panel__connection-subject">
                          {formatSubject(conn.subject)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Superseded by */}
              {entry.superseded_by && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">Superseded by</div>
                  <div className="side-panel__connection">
                    <span
                      className="side-panel__connection-dot"
                      style={{
                        backgroundColor:
                          SUBJECT_COLORS[
                            entry.superseded_by.subject as Subject
                          ] ?? '#888',
                      }}
                    />
                    <div className="side-panel__connection-info">
                      <button
                        className="side-panel__connection-link"
                        onClick={() =>
                          onNavigateToEntry(
                            entry.superseded_by!.id,
                            entry.year,
                          )
                        }
                      >
                        {entry.superseded_by.title}
                      </button>
                      <div className="side-panel__connection-subject">
                        {formatSubject(entry.superseded_by.subject)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {entry.tags.length > 0 && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">Tags</div>
                  <div className="side-panel__tags">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="side-panel__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {entry.references.length > 0 && (
                <div className="side-panel__section">
                  <div className="side-panel__section-title">References</div>
                  {entry.references.map((ref, idx) => (
                    <a
                      key={idx}
                      className="side-panel__reference"
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ref.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
