import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Entry } from '../types';
import {
  yearToPixel,
  pixelToYear,
  getEraSegments,
} from '../utils/scrubberScale';


interface ScrubberBarProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  eras: Era[];
  entries: Entry[];
}

const BAR_HEIGHT = 60;
const HANDLE_RADIUS = 8;
const HISTOGRAM_HEIGHT = 20;
const HISTOGRAM_BUCKETS_PER_ERA = 20;

/** Subtle tint colors for each era style in the scrubber segments */
const ERA_SEGMENT_TINTS: Record<string, string> = {
  'aged-stone': 'rgba(139, 110, 60, 0.30)',
  'papyrus': 'rgba(160, 125, 65, 0.25)',
  'marble': 'rgba(150, 135, 95, 0.20)',
  'parchment': 'rgba(140, 115, 65, 0.22)',
  'renaissance': 'rgba(120, 105, 80, 0.18)',
  'industrial': 'rgba(70, 95, 130, 0.18)',
  'clean': 'rgba(55, 100, 150, 0.18)',
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

  // Histogram data: entry density per bucket within each era
  const histogramBars = useMemo(() => {
    const bars: { x: number; width: number; height: number }[] = [];
    if (segments.length === 0 || entries.length === 0) return bars;

    // Find max count for normalization
    let maxCount = 0;
    const allBuckets: { x: number; w: number; count: number }[] = [];

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
        const count = entries.filter(
          (e) => e.year >= yearStart && e.year < yearEnd,
        ).length;
        allBuckets.push({
          x: seg.startPx + b * bucketWidthPx,
          w: bucketWidthPx,
          count,
        });
        if (count > maxCount) maxCount = count;
      }
    }

    for (const bucket of allBuckets) {
      if (bucket.count === 0) continue;
      bars.push({
        x: bucket.x,
        width: bucket.w,
        height: (bucket.count / maxCount) * HISTOGRAM_HEIGHT,
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
        transition: 'background-color 800ms ease-in-out',
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
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
          {/* Era label */}
          <div
            style={{
              position: 'absolute',
              left: seg.startPx + 4,
              top: 2,
              fontSize: 9,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: seg.endPx - seg.startPx - 8,
            }}
          >
            {seg.era.label}
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
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          )}
        </div>
      ))}

      {/* Density histogram */}
      {histogramBars.map((bar, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: bar.x,
            width: Math.max(1, bar.width - 1),
            bottom: 4,
            height: bar.height,
            backgroundColor: 'var(--histogram-color, rgba(74, 144, 217, 0.3))',
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        />
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
          fontSize: 11,
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: 4,
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
          backgroundColor: 'var(--handle-color, rgba(224, 216, 200, 0.8))',
          transform: 'translateX(-1px)',
          pointerEvents: 'none',
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
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}
