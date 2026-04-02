import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
  return `${year} CE`;
}

const LINE_HEIGHT = 48; // px per line
const SCROLL_SPEED = 0.4; // px per frame (~24px/sec at 60fps)
const PAUSE_FRAMES = 180; // pause ~3 seconds on each entry before scrolling

export default function HistoryTicker({
  entries,
  currentYear,
  eras,
  showContextLayer,
  isInteracting,
  sidePanelOpen,
}: HistoryTickerProps) {
  const [visible, setVisible] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const rafRef = useRef<number>(0);
  const pauseCountRef = useRef(0);

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
        return Math.abs(a.year - currentYear) - Math.abs(b.year - currentYear);
      })
      .slice(0, 8);
  }, [entries, currentYear, windowWidth]);

  // Reset scroll when entries change
  useEffect(() => {
    setScrollOffset(0);
    pauseCountRef.current = 0;
  }, [historyEntries]);

  // Idle timer: show after 800ms of no interaction
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

  // Dismiss on any click on the map
  const handleMapClick = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('click', handleMapClick, true);
    return () => window.removeEventListener('click', handleMapClick, true);
  }, [visible, handleMapClick]);

  // Rolling animation
  useEffect(() => {
    if (!visible || historyEntries.length <= 1) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const totalHeight = historyEntries.length * LINE_HEIGHT;

    const animate = () => {
      setScrollOffset((prev) => {
        // Check if we're at a snap point (aligned to a line)
        const snapRemainder = prev % LINE_HEIGHT;
        const isSnapped = snapRemainder < SCROLL_SPEED * 1.5;

        if (isSnapped && pauseCountRef.current < PAUSE_FRAMES) {
          pauseCountRef.current++;
          return prev;
        }

        pauseCountRef.current = 0;
        const next = prev + SCROLL_SPEED;
        // Loop seamlessly
        return next >= totalHeight ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, historyEntries.length]);

  if (!showContextLayer || sidePanelOpen || historyEntries.length === 0) {
    return null;
  }

  // Double the entries for seamless loop
  const displayEntries = [...historyEntries, ...historyEntries];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 86,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 520,
        maxWidth: '85vw',
        height: LINE_HEIGHT,
        overflow: 'hidden',
        background: 'rgba(15, 12, 20, 0.35)',
        borderRadius: 8,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        zIndex: 900,
      }}
    >
      <div
        style={{
          transform: `translateY(-${scrollOffset}px)`,
          willChange: 'transform',
        }}
      >
        {displayEntries.map((entry, i) => (
          <div
            key={`${entry.id}-${i}`}
            style={{
              height: LINE_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '0 20px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'rgba(255, 180, 60, 0.7)',
                flexShrink: 0,
              }}
            >
              {formatYear(entry.year)}
            </span>
            <span
              style={{
                fontSize: 18,
                color: 'rgba(255, 255, 255, 0.6)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
