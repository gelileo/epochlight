import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Entry, Subject } from '../types';
import {
  yearToPixel,
  pixelToYear,
  getEraSegments,
  getZoomedEraSegments,
  zoomedYearToPixel,
  zoomedPixelToYear,
} from '../utils/scrubberScale';
import type { ScrubberZoom } from '../utils/scrubberScale';
import { useLocale } from '../hooks/useLocale';
import { useFeature } from '../hooks/useTier';
import { SUBJECT_COLORS } from '../types';

interface ScrubberBarProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  eras: Era[];
  entries: Entry[];
  onEntrySelect?: (entryId: string) => void;
  onZoomChange?: (zoomed: boolean) => void;
}

const BAR_HEIGHT = 64;
const HANDLE_RADIUS = 9;
const HISTOGRAM_HEIGHT = 24;
const HISTOGRAM_BUCKETS_PER_ERA = 20;
const ZOOMED_BUCKETS_PER_ERA = 50;
const TICK_CLUSTER_PX = 4;

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

// --- Entry tick types ---
interface EntryTick {
  px: number;
  entry: Entry;
}

interface TickCluster {
  px: number;
  width: number;
  entries: Entry[];
  color: string;
}

function clusterTicks(ticks: EntryTick[]): TickCluster[] {
  if (ticks.length === 0) return [];

  const sorted = [...ticks].sort((a, b) => a.px - b.px);
  const clusters: TickCluster[] = [];
  let current: EntryTick[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].px - current[0].px <= TICK_CLUSTER_PX) {
      current.push(sorted[i]);
    } else {
      clusters.push(buildCluster(current));
      current = [sorted[i]];
    }
  }
  clusters.push(buildCluster(current));
  return clusters;
}

function buildCluster(ticks: EntryTick[]): TickCluster {
  const avgPx = ticks.reduce((s, t) => s + t.px, 0) / ticks.length;
  // Use the most common subject color, or first entry's color
  const subjectCounts = new Map<Subject, number>();
  for (const t of ticks) {
    subjectCounts.set(t.entry.subject, (subjectCounts.get(t.entry.subject) ?? 0) + 1);
  }
  let maxSubject = ticks[0].entry.subject;
  let maxCount = 0;
  for (const [subj, count] of subjectCounts) {
    if (count > maxCount) { maxCount = count; maxSubject = subj; }
  }
  return {
    px: avgPx,
    width: Math.max(2, ticks.length * 2),
    entries: ticks.map((t) => t.entry),
    color: SUBJECT_COLORS[maxSubject] ?? '#888',
  };
}

export default function ScrubberBar({
  currentYear,
  onYearChange,
  eras,
  entries,
  onEntrySelect,
  onZoomChange,
}: ScrubberBarProps) {
  const { t } = useLocale();
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(1000);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState<ScrubberZoom>({ mode: 'overview' });
  const [hoveredCluster, setHoveredCluster] = useState<TickCluster | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const { enabled: zoomEnabled } = useFeature('scrubber-zoom');

  const isZoomed = zoom.mode === 'era';
  const zoomedEraId = zoom.mode === 'era' ? zoom.eraId : null;

  // Notify parent when zoom state changes
  useEffect(() => {
    onZoomChange?.(isZoomed);
  }, [isZoomed, onZoomChange]);

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

  // Segments: overview or zoomed
  const segments = useMemo(() => {
    if (isZoomed && zoomedEraId) {
      return getZoomedEraSegments(eras, barWidth, zoomedEraId);
    }
    return getEraSegments(eras, barWidth, entries);
  }, [eras, barWidth, entries, isZoomed, zoomedEraId]);

  // Handle pixel position
  const handlePx = useMemo(() => {
    if (isZoomed && zoomedEraId) {
      return zoomedYearToPixel(currentYear, eras, barWidth, zoomedEraId);
    }
    return yearToPixel(currentYear, eras, barWidth, entries);
  }, [currentYear, eras, barWidth, entries, isZoomed, zoomedEraId]);

  const minYear = eras.length > 0 ? eras[0].start : 0;
  const maxYear = eras.length > 0 ? eras[eras.length - 1].end : 100;

  // Histogram bars
  const histogramBars = useMemo(() => {
    const bars: { x: number; width: number; scienceHeight: number; historyHeight: number }[] = [];
    if (segments.length === 0 || entries.length === 0) return bars;

    const bucketsPerEra = isZoomed ? ZOOMED_BUCKETS_PER_ERA : HISTOGRAM_BUCKETS_PER_ERA;
    let maxCount = 0;
    const allBuckets: { x: number; w: number; scienceCount: number; historyCount: number }[] = [];

    for (const seg of segments) {
      const segWidth = seg.endPx - seg.startPx;
      const bucketCount = Math.max(1, Math.min(bucketsPerEra, Math.floor(segWidth / 4)));
      const bucketWidthPx = segWidth / bucketCount;

      // Determine year range for this segment
      let yearStart: number, yearEnd: number;
      if (seg.isOverlap) {
        // Overlap segments show partial era range
        const eraSpan = seg.era.end - seg.era.start;
        const overlapYears = eraSpan * 0.3;
        if (seg.startPx === 0) {
          yearStart = seg.era.end - overlapYears;
          yearEnd = seg.era.end;
        } else {
          yearStart = seg.era.start;
          yearEnd = seg.era.start + overlapYears;
        }
      } else {
        yearStart = seg.era.start;
        yearEnd = seg.era.end;
      }
      const eraSpan = yearEnd - yearStart;

      for (let b = 0; b < bucketCount; b++) {
        const bStart = yearStart + (b / bucketCount) * eraSpan;
        const bEnd = yearStart + ((b + 1) / bucketCount) * eraSpan;
        const inRange = entries.filter((e) => e.year >= bStart && e.year < bEnd);
        const historyCount = inRange.filter((e) => e.subject === 'world-history').length;
        const scienceCount = inRange.length - historyCount;
        const total = scienceCount + historyCount;
        allBuckets.push({ x: seg.startPx + b * bucketWidthPx, w: bucketWidthPx, scienceCount, historyCount });
        if (total > maxCount) maxCount = total;
      }
    }

    for (const bucket of allBuckets) {
      const total = bucket.scienceCount + bucket.historyCount;
      if (total === 0) continue;
      bars.push({
        x: bucket.x,
        width: bucket.w,
        scienceHeight: (bucket.scienceCount / maxCount) * HISTOGRAM_HEIGHT,
        historyHeight: (bucket.historyCount / maxCount) * HISTOGRAM_HEIGHT,
      });
    }

    return bars;
  }, [segments, entries, isZoomed]);

  // Entry ticks (only when zoomed)
  const tickClusters = useMemo(() => {
    if (!isZoomed || !zoomedEraId) return [];

    const ticks: EntryTick[] = [];
    for (const entry of entries) {
      const px = zoomedYearToPixel(entry.year, eras, barWidth, zoomedEraId);
      if (px >= 0 && px <= barWidth) {
        ticks.push({ px, entry });
      }
    }
    return clusterTicks(ticks);
  }, [isZoomed, zoomedEraId, entries, eras, barWidth]);

  // Pixel → year conversion
  const pointerToYear = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return currentYear;
      const rect = el.getBoundingClientRect();
      const px = Math.max(0, Math.min(barWidth, clientX - rect.left));
      if (isZoomed && zoomedEraId) {
        return zoomedPixelToYear(px, eras, barWidth, zoomedEraId);
      }
      return pixelToYear(px, eras, barWidth, entries);
    },
    [barWidth, eras, entries, currentYear, isZoomed, zoomedEraId],
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

  // Click era label to zoom in
  const handleEraClick = useCallback(
    (eraId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!zoomEnabled) return;
      if (isZoomed && zoomedEraId === eraId) {
        setZoom({ mode: 'overview' });
      } else {
        setZoom({ mode: 'era', eraId });
      }
    },
    [zoomEnabled, isZoomed, zoomedEraId],
  );

  const handleZoomOut = useCallback(() => {
    setZoom({ mode: 'overview' });
  }, []);

  // Click entry tick to select
  const handleTickClick = useCallback(
    (cluster: TickCluster, e: React.MouseEvent) => {
      e.stopPropagation();
      if (cluster.entries.length === 1 && onEntrySelect) {
        onEntrySelect(cluster.entries[0].id);
        onYearChange(cluster.entries[0].year);
      } else if (cluster.entries.length > 1 && onEntrySelect) {
        // Select the entry closest to current year
        const closest = cluster.entries.reduce((a, b) =>
          Math.abs(a.year - currentYear) < Math.abs(b.year - currentYear) ? a : b
        );
        onEntrySelect(closest.id);
        onYearChange(closest.year);
      }
    },
    [onEntrySelect, onYearChange, currentYear],
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape' && isZoomed) {
        e.preventDefault();
        setZoom({ mode: 'overview' });
        return;
      }

      const step = getYearStep(eras, currentYear);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onYearChange(Math.max(minYear, currentYear - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onYearChange(Math.min(maxYear, currentYear + step));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        for (let i = eras.length - 1; i >= 0; i--) {
          if (eras[i].start < currentYear) {
            onYearChange(eras[i].start);
            return;
          }
        }
        onYearChange(minYear);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        for (const era of eras) {
          if (era.end > currentYear) {
            onYearChange(era.end);
            return;
          }
        }
        onYearChange(maxYear);
      } else if (e.key === 'Enter' && !isZoomed && zoomEnabled) {
        // Zoom into the era of the current year
        e.preventDefault();
        for (const era of eras) {
          if (currentYear >= era.start && currentYear <= era.end) {
            setZoom({ mode: 'era', eraId: era.id });
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eras, currentYear, minYear, maxYear, onYearChange, isZoomed, zoomEnabled]);

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
          key={`bg-${seg.era.id}-${seg.isOverlap ? 'overlap' : 'main'}`}
          style={{
            position: 'absolute',
            left: seg.startPx,
            width: seg.endPx - seg.startPx,
            top: 0,
            bottom: 0,
            backgroundColor:
              ERA_SEGMENT_TINTS[seg.era.style] ?? 'rgba(80, 90, 100, 0.10)',
            opacity: seg.isOverlap ? 0.4 : 1,
          }}
        />
      ))}

      {/* Era boundary tick marks and labels */}
      {segments.map((seg, i) => (
        <div key={`label-${seg.era.id}-${seg.isOverlap ? 'overlap' : 'main'}`}>
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
          {/* Era label (clickable for zoom) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleEraClick(seg.era.id, e)}
            style={{
              position: 'absolute',
              left: seg.startPx + 6,
              top: 2,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--chrome-text, rgba(255,255,255,0.7))',
              opacity: seg.isOverlap ? 0.4 : 0.75,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              pointerEvents: 'auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: seg.endPx - seg.startPx - 12,
              cursor: zoomEnabled ? 'pointer' : 'default',
              padding: '2px 4px',
              borderRadius: 3,
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

      {/* Density histogram */}
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

      {/* Entry tick marks (zoomed mode only) */}
      {isZoomed && tickClusters.map((cluster, i) => (
        <div
          key={i}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => handleTickClick(cluster, e)}
          onMouseEnter={(e) => {
            setHoveredCluster(cluster);
            setHoverPos({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            setHoverPos({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => setHoveredCluster(null)}
          style={{
            position: 'absolute',
            left: cluster.px - cluster.width / 2,
            bottom: 4,
            width: cluster.width,
            height: HISTOGRAM_HEIGHT + 4,
            backgroundColor: cluster.color,
            opacity: 0.7,
            borderRadius: cluster.entries.length > 1 ? 3 : 1,
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2,
          }}
        />
      ))}

      {/* Tick hover tooltip */}
      {hoveredCluster && (
        <div
          style={{
            position: 'fixed',
            left: hoverPos.x + 12,
            top: hoverPos.y - 40,
            background: 'var(--chrome-bg, rgba(20, 20, 30, 0.95))',
            color: 'var(--chrome-text, #fff)',
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.4,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            maxHeight: 120,
            overflow: 'hidden',
          }}
        >
          {hoveredCluster.entries.length === 1 ? (
            <>
              <div style={{ fontWeight: 600 }}>{hoveredCluster.entries[0].title}</div>
              <div style={{ opacity: 0.7 }}>{formatYear(hoveredCluster.entries[0].year)}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>{hoveredCluster.entries.length} entries</div>
              {hoveredCluster.entries.slice(0, 4).map((e) => (
                <div key={e.id} style={{ opacity: 0.7 }}>{e.title}</div>
              ))}
              {hoveredCluster.entries.length > 4 && (
                <div style={{ opacity: 0.5 }}>+{hoveredCluster.entries.length - 4} more</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Zoom-out button (zoomed mode only) */}
      {isZoomed && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          style={{
            position: 'absolute',
            right: 8,
            top: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--chrome-text, rgba(255,255,255,0.7))',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 3,
          }}
        >
          ← All Eras
        </div>
      )}

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
