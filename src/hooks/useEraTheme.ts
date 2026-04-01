import { useEffect, useMemo } from 'react';
import type { Era } from '../types';
import { getEraForYear } from '../utils/timeWindow';
import { ERA_THEMES, type EraTheme } from '../styles/era-themes';

/**
 * Derives the current era theme and sets CSS custom properties on :root
 * so all components can consume theme colors without prop drilling.
 */
const DEFAULT_THEME = ERA_THEMES['clean']!;

export function useEraTheme(currentYear: number, eras: Era[]): EraTheme {
  const theme = useMemo(() => {
    if (eras.length === 0) return DEFAULT_THEME;
    const era = getEraForYear(currentYear, eras);
    return ERA_THEMES[era.style] ?? DEFAULT_THEME;
  }, [currentYear, eras]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chrome-bg', theme.chromeBg);
    root.style.setProperty('--chrome-text', theme.chromeText);
    root.style.setProperty('--chrome-muted', theme.chromeMuted);
    root.style.setProperty('--chrome-border', theme.chromeBorder);
    root.style.setProperty('--chrome-accent', theme.chromeAccent);
    root.style.setProperty('--handle-color', theme.handleColor);
    root.style.setProperty('--histogram-color', theme.histogramColor);
    root.style.setProperty('--map-filter', theme.mapFilter);
  }, [theme]);

  return theme;
}
