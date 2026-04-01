import { useMemo } from 'react';
import type { Entry, Era, Subject } from '../types';
import { SUBJECT_COLORS } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';
import { trackEvent } from '../utils/analytics';
import './SubjectPills.css';

const ALL_SUBJECTS: Subject[] = [
  'mathematics',
  'physics',
  'chemistry',
  'medicine-biology',
  'inventions-engineering',
  'astronomy-cosmology',
  'philosophy-logic',
];

const SUBJECT_DISPLAY_NAMES: Record<Subject, string> = {
  mathematics: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  'medicine-biology': 'Medicine & Biology',
  'inventions-engineering': 'Engineering & Inventions',
  'astronomy-cosmology': 'Astronomy & Cosmology',
  'philosophy-logic': 'Philosophy & Logic',
};

interface SubjectPillsProps {
  enabledSubjects: Set<Subject>;
  onToggleSubject: (subject: Subject) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  entries: Entry[];
  currentYear: number;
  eras: Era[];
}

export default function SubjectPills({
  enabledSubjects,
  onToggleSubject,
  onEnableAll,
  onDisableAll,
  entries,
  currentYear,
  eras,
}: SubjectPillsProps) {
  const windowWidth = getWindowWidth(currentYear, eras);

  const visibleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of ALL_SUBJECTS) {
      counts[subject] = 0;
    }
    for (const entry of entries) {
      const opacity = getEntryOpacity(entry.year, currentYear, windowWidth);
      if (opacity > 0) {
        counts[entry.subject] = (counts[entry.subject] || 0) + 1;
      }
    }
    return counts;
  }, [entries, currentYear, windowWidth]);

  const enabledCount = enabledSubjects.size;

  return (
    <div className="subject-pills" aria-label="Subject filter controls">
      <div className="subject-pills__header">
        <span className="subject-pills__header-icon" aria-hidden="true">
          ≡
        </span>
        <span>
          Subjects {enabledCount}/{ALL_SUBJECTS.length}
        </span>
      </div>
      <div className="subject-pills__body">
        <ul className="subject-pills__list">
          {ALL_SUBJECTS.map((subject) => {
            const enabled = enabledSubjects.has(subject);
            return (
              <li
                key={subject}
                className={`subject-pills__item${enabled ? '' : ' subject-pills__item--disabled'}`}
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${SUBJECT_DISPLAY_NAMES[subject]}`}
                tabIndex={0}
                onClick={() => {
                  const isNowEnabled = !enabledSubjects.has(subject);
                  trackEvent('subject_toggled', { subject, enabled: isNowEnabled ? 1 : 0 });
                  onToggleSubject(subject);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const isNowEnabled = !enabledSubjects.has(subject);
                    trackEvent('subject_toggled', { subject, enabled: isNowEnabled ? 1 : 0 });
                    onToggleSubject(subject);
                  }
                }}
              >
                <span
                  className="subject-pills__dot"
                  style={{ backgroundColor: SUBJECT_COLORS[subject] }}
                />
                <span className="subject-pills__label">
                  {SUBJECT_DISPLAY_NAMES[subject]}
                </span>
                <span className="subject-pills__count">
                  {visibleCounts[subject]}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="subject-pills__shortcuts">
          <button
            className="subject-pills__shortcut-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEnableAll();
            }}
          >
            All
          </button>
          <button
            className="subject-pills__shortcut-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDisableAll();
            }}
          >
            None
          </button>
        </div>
      </div>
    </div>
  );
}
