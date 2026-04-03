import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Entry } from '../types';
import {
  yearToPixel,
  pixelToYear,
  getEraSegments,
} from '../utils/scrubberScale';
import { useLocale } from '../hooks/useLocale';


interface ScrubberBarProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  eras: Era[];
  entries: Entry[];
}

const BAR_HEIGHT = 64;
const HANDLE_RADIUS = 9;
const HISTOGRAM_HEIGHT = 24;
const HISTOGRAM_BUCKETS_PER_ERA = 20;

/** Tint colors for each era segment — bolder for clarity */
const ERA_SEGMENT_TINTS: Record<string, string> = {
  'aged-stone': 'rgba(160, 120, 50, 0.45)',
  'papyrus': 'rgba(175, 135, 55, 0.40)',
  'marble': 'rgba(160, 145, 100, 0.35)',
  'parchment': 'rgba(155, 125, 60, 0.35)',
  'renaissance': 'rgba(130, 115, 85, 0.30)',
  'industrial': 'rgba(60, 100, 150, 0.30)',
  'clean': 'rgba(45, 110, 170, 0.30)',
};

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(Math.round(year))} BCE`;
  return `${Math.round(year)} CE`;
}

function getYearStep(eras: Era[], currentYear: number): number {
  for (const era of eras) {
    if (currentYear >= era.start && currentYear <= era.end) {
      const span = era.end - era.start;
      if (span > 3000) return 100;
      if (span > 500) return 10;
      return 1;
    }
  }
  return 1;
}

export default function ScrubberBar({
  currentYear,
  onYearChange,
  eras,
  entries,
}: ScrubberBarProps) {
  const { t } = useLocale();
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(1000);
  const [isDragging, setIsDragging] = useState(false);

  // Measure bar width
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBarWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo(
    () => getEraSegments(eras, barWidth, entries),
    [eras, barWidth, entries],
  );

  const handlePx = useMemo(
    () => yearToPixel(currentYear, eras, barWidth, entries),
    [currentYear, eras, barWidth, entries],
  );

  const minYear = eras.length > 0 ? eras[0].start : 0;
  const maxYear = eras.length > 0 ? eras[eras.length - 1].end : 100;

  // Histogram data: entry density per bucket within each era, split by subject
  const histogramBars = useMemo(() => {
    const bars: {
      x: number;
      width: number;
      scienceHeight: number;
      historyHeight: number;
    }[] = [];
    if (segments.length === 0 || entries.length === 0) return bars;

    // Find max total count for normalization
    let maxCount = 0;
    const allBuckets: {
      x: number;
      w: number;
      scienceCount: number;
      historyCount: number;
    }[] = [];

    for (const seg of segments) {
      const segWidth = seg.endPx - seg.startPx;
      const bucketCount = Math.max(
        1,
        Math.min(HISTOGRAM_BUCKETS_PER_ERA, Math.floor(segWidth / 4)),
      );
      const bucketWidthPx = segWidth / bucketCount;
      const eraSpan = seg.era.end - seg.era.start;

      for (let b = 0; b < bucketCount; b++) {
        const yearStart =
          seg.era.start + (b / bucketCount) * eraSpan;
        const yearEnd =
          seg.era.start + ((b + 1) / bucketCount) * eraSpan;
        const inRange = entries.filter(
          (e) => e.year >= yearStart && e.year < yearEnd,
        );
        const historyCount = inRange.filter(
          (e) => e.subject === 'world-history',
        ).length;
        const scienceCount = inRange.length - historyCount;
        const total = scienceCount + historyCount;
        allBuckets.push({
          x: seg.startPx + b * bucketWidthPx,
          w: bucketWidthPx,
          scienceCount,
          historyCount,
        });
        if (total > maxCount) maxCount = total;
      }
    }

    for (const bucket of allBuckets) {
      const total = bucket.scienceCount + bucket.historyCount;
      if (total === 0) continue;
      bars.push({
        x: bucket.x,
        width: bucket.w,
        scienceHeight:
          (bucket.scienceCount / maxCount) * HISTOGRAM_HEIGHT,
        historyHeight:
          (bucket.historyCount / maxCount) * HISTOGRAM_HEIGHT,
      });
    }

    return bars;
  }, [segments, entries]);

  // Convert pointer X to year
  const pointerToYear = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return currentYear;
      const rect = el.getBoundingClientRect();
      const px = Math.max(0, Math.min(barWidth, clientX - rect.left));
      return pixelToYear(px, eras, barWidth, entries);
    },
    [barWidth, eras, entries, currentYear],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      onYearChange(pointerToYear(e.clientX));
    },
    [onYearChange, pointerToYear],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      onYearChange(pointerToYear(e.clientX));
    },
    [isDragging, onYearChange, pointerToYear],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is in a text input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const step = getYearStep(eras, currentYear);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onYearChange(Math.max(minYear, currentYear - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onYearChange(Math.min(maxYear, currentYear + step));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        // Jump to previous era boundary
        for (let i = eras.length - 1; i >= 0; i--) {
          if (eras[i].start < currentYear) {
            onYearChange(eras[i].start);
            return;
          }
        }
        onYearChange(minYear);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        // Jump to next era boundary
        for (const era of eras) {
          if (era.end > currentYear) {
            onYearChange(era.end);
            return;
          }
        }
        onYearChange(maxYear);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eras, currentYear, minYear, maxYear, onYearChange]);

  return (
    <div
      ref={barRef}
      role="slider"
      aria-valuenow={Math.round(currentYear)}
      aria-valuemin={minYear}
      aria-valuemax={maxYear}
      aria-label="Timeline cursor"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT,
        backgroundColor: 'var(--chrome-bg, rgba(26, 26, 46, 0.9))',
        borderTop: '1px solid var(--chrome-border, rgba(255,255,255,0.15))',
        transition: 'background-color 800ms ease-in-out, border-color 800ms ease-in-out',
        zIndex: 100,
        cursor: isDragging ? 'grabbing' : 'pointer',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Era background segments */}
      {segments.map((seg) => (
        <div
          key={seg.era.id}
          style={{
            position: 'absolute',
            left: seg.startPx,
            width: seg.endPx - seg.startPx,
            top: 0,
            bottom: 0,
            backgroundColor:
              ERA_SEGMENT_TINTS[seg.era.style] ?? 'rgba(80, 90, 100, 0.10)',
          }}
        />
      ))}

      {/* Era boundary tick marks and labels */}
      {segments.map((seg, i) => (
        <div key={`label-${seg.era.id}`}>
          {/* Tick mark at start */}
          <div
            style={{
              position: 'absolute',
              left: seg.startPx,
              top: 0,
              width: 1,
              height: BAR_HEIGHT,
              backgroundColor: 'var(--chrome-text, rgba(255,255,255,0.35))',
              opacity: 0.35,
            }}
          />
          {/* Era label */}
          <div
            style={{
              position: 'absolute',
              left: seg.startPx + 6,
              top: 4,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--chrome-text, rgba(255,255,255,0.7))',
              opacity: 0.75,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: seg.endPx - seg.startPx - 12,
            }}
          >
            {t(`era.${seg.era.id}`)}
          </div>
          {/* Tick at end for last segment */}
          {i === segments.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: seg.endPx - 1,
                top: 0,
                width: 1,
                height: BAR_HEIGHT,
                backgroundColor: 'var(--chrome-text, rgba(255,255,255,0.35))',
                opacity: 0.35,
              }}
            />
          )}
        </div>
      ))}

      {/* Density histogram — stacked: science (bottom) + history (top) */}
      {histogramBars.map((bar, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: bar.x,
            width: Math.max(1, bar.width - 1),
            bottom: 4,
            height: bar.scienceHeight + bar.historyHeight,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* History segment (top) */}
          {bar.historyHeight > 0 && (
            <div
              style={{
                width: '100%',
                height: bar.historyHeight,
                backgroundColor: 'rgba(192, 149, 108, 0.5)',
                borderRadius: bar.scienceHeight > 0 ? '2px 2px 0 0' : 2,
              }}
            />
          )}
          {/* Science segment (bottom) */}
          {bar.scienceHeight > 0 && (
            <div
              style={{
                width: '100%',
                height: bar.scienceHeight,
                backgroundColor: 'var(--histogram-color, rgba(80, 160, 230, 0.65))',
                borderRadius: bar.historyHeight > 0 ? '0 0 2px 2px' : 2,
              }}
            />
          )}
        </div>
      ))}

      {/* Year badge floating above handle */}
      <div
        style={{
          position: 'absolute',
          left: handlePx,
          bottom: BAR_HEIGHT + 4,
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--chrome-bg, rgba(26, 26, 46, 0.95))',
          color: 'var(--chrome-text, #e0d8c8)',
          fontSize: 15,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 5,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '1px solid var(--chrome-border, rgba(255,255,255,0.15))',
        }}
      >
        {formatYear(currentYear)}
      </div>

      {/* Drag handle: vertical line */}
      <div
        style={{
          position: 'absolute',
          left: handlePx,
          top: 0,
          width: 2,
          height: BAR_HEIGHT,
          backgroundColor: 'var(--handle-color, rgba(224, 216, 200, 0.9))',
          transform: 'translateX(-1px)',
          pointerEvents: 'none',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }}
      />

      {/* Drag handle: circle */}
      <div
        style={{
          position: 'absolute',
          left: handlePx,
          top: BAR_HEIGHT / 2,
          width: HANDLE_RADIUS * 2,
          height: HANDLE_RADIUS * 2,
          borderRadius: '50%',
          backgroundColor: 'var(--handle-color, #e0d8c8)',
          border: '2px solid var(--chrome-bg, rgba(26, 26, 46, 0.9))',
          transform: `translate(-${HANDLE_RADIUS}px, -${HANDLE_RADIUS}px)`,
          pointerEvents: 'none',
          boxShadow: '0 1px 6px rgba(0,0,0,0.5), 0 0 12px rgba(255,255,255,0.15)',
        }}
      />
    </div>
  );
}
