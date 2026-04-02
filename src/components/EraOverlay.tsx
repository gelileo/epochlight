import { useEffect, useMemo, useRef, useState } from 'react';
import type { Era } from '../types';
import { getEraForYear } from '../utils/timeWindow';
import { ERA_THEMES } from '../styles/era-themes';
import { useLocale } from '../hooks/useLocale';

interface EraOverlayProps {
  currentYear: number;
  eras: Era[];
}

export default function EraOverlay({ currentYear, eras }: EraOverlayProps) {
  const { t } = useLocale();
  const era = useMemo(() => getEraForYear(currentYear, eras), [currentYear, eras]);
  const theme = ERA_THEMES[era.style] ?? ERA_THEMES['clean']!;

  // Era label toast
  const [toastLabel, setToastLabel] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const prevEraId = useRef(era.id);

  useEffect(() => {
    if (era.id !== prevEraId.current) {
      prevEraId.current = era.id;
      setToastLabel(t(`era.${era.id}`));
      setToastVisible(true);

      const timer = setTimeout(() => {
        setToastVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [era.id, t]);

  return (
    <>
      {/* Tint layer */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
          backgroundColor: theme.tint,
          mixBlendMode: 'multiply',
          transition: 'background-color 800ms ease-in-out',
        }}
      />

      {/* Vignette layer */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 11,
          background: `radial-gradient(ellipse at center, transparent 40%, ${theme.vignette} 100%)`,
          transition: 'background 800ms ease-in-out',
        }}
      />

      {/* Era label toast */}
      {toastLabel && (
        <div
          style={{
            position: 'fixed',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 12,
            pointerEvents: 'none',
            color: theme.toastColor,
            fontSize: '1.4rem',
            fontWeight: 300,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            opacity: toastVisible ? 1 : 0,
            transition: 'opacity 600ms ease-in-out',
          }}
          onTransitionEnd={() => {
            if (!toastVisible) setToastLabel(null);
          }}
        >
          {toastLabel}
        </div>
      )}
    </>
  );
}
