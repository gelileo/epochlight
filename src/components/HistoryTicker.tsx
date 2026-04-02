import { useState, useEffect, useMemo } from 'react';
import type { Entry, Era } from '../types';
import { getEntryOpacity, getWindowWidth } from '../utils/timeWindow';

interface HistoryTickerProps {
  entries: Entry[];
  currentYear: number;
  eras: Era[];
  showContextLayer: boolean;
  isInteracting: boolean;
  sidePanelOpen: boolean;
}

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

export default function HistoryTicker({
  entries,
  currentYear,
  eras,
  showContextLayer,
  isInteracting,
  sidePanelOpen,
}: HistoryTickerProps) {
  const [visible, setVisible] = useState(false);

  const windowWidth = useMemo(
    () => getWindowWidth(currentYear, eras),
    [currentYear, eras],
  );

  const historyEntries = useMemo(() => {
    return entries
      .filter(
        (e) =>
          e.subject === 'world-history' &&
          getEntryOpacity(e.year, currentYear, windowWidth) >= 1.0,
      )
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return (
          Math.abs(a.year - currentYear) - Math.abs(b.year - currentYear)
        );
      })
      .slice(0, 8);
  }, [entries, currentYear, windowWidth]);

  // Idle timer: fade in after 2.5s of no interaction
  useEffect(() => {
    if (!showContextLayer || sidePanelOpen || isInteracting || historyEntries.length === 0) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [showContextLayer, sidePanelOpen, isInteracting, historyEntries.length]);

  // Don't render at all if conditions aren't met
  if (!showContextLayer || sidePanelOpen || historyEntries.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 140,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 380,
        maxWidth: '90vw',
        background: 'var(--chrome-bg, rgba(26, 26, 46, 0.85))',
        borderRadius: 12,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        padding: '10px 14px',
        zIndex: 1000,
      }}
    >
      {historyEntries.map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: '4px 0',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--chrome-muted)',
              marginRight: 6,
            }}
          >
            {formatYear(entry.year)}
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--chrome-text)',
            }}
          >
            — {entry.title}
          </span>
        </div>
      ))}
    </div>
  );
}
