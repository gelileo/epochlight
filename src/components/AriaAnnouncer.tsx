import { useEffect, useRef, useState } from 'react';
import type { Era, Entry } from '../types';
import { formatYear } from '../utils/formatUtils';
import { getEraForYear } from '../utils/timeWindow';

interface AriaAnnouncerProps {
  currentYear: number;
  eras: Era[];
  selectedEntry: Entry | null;
}

function formatSubject(subject: string): string {
  return subject
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' / ');
}

/**
 * Visually hidden aria-live region that announces state changes to screen readers.
 * Announces era transitions and entry selections.
 */
export default function AriaAnnouncer({
  currentYear,
  eras,
  selectedEntry,
}: AriaAnnouncerProps) {
  const [message, setMessage] = useState('');
  const prevEraRef = useRef<string | null>(null);
  const prevEntryRef = useRef<string | null>(null);

  // Announce era changes
  useEffect(() => {
    const currentEra = getEraForYear(currentYear, eras);
    const currentEraId = currentEra?.id ?? null;

    if (currentEraId && currentEraId !== prevEraRef.current) {
      if (prevEraRef.current !== null) {
        // Only announce after the initial era is set (not on first render)
        setMessage(
          `Now entering the ${currentEra!.label}, ${formatYear(currentEra!.start)}\u2013${formatYear(currentEra!.end)}`,
        );
      }
      prevEraRef.current = currentEraId;
    }
  }, [currentYear, eras]);

  // Announce entry selection
  useEffect(() => {
    const entryId = selectedEntry?.id ?? null;

    if (entryId && entryId !== prevEntryRef.current) {
      setMessage(
        `Selected: ${selectedEntry!.title}, ${formatYear(selectedEntry!.year)}, ${formatSubject(selectedEntry!.subject)}`,
      );
    }
    prevEntryRef.current = entryId;
  }, [selectedEntry]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  );
}
