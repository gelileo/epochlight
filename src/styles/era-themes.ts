/**
 * Era visual themes — each era has a distinct visual identity.
 *
 * Pre-modern eras: warm, yellowed, rustic (ancient map feel)
 * Modern eras: cool, bright, bluish/aqua (clean atlas feel)
 *
 * The `mapFilter` CSS filter is applied to the entire map container
 * and is the primary lever for the visual shift.
 */

export interface EraTheme {
  /** CSS filter applied to the map container */
  mapFilter: string;
  /** Tint overlay color */
  tint: string;
  /** Vignette edge darkness */
  vignette: string;
  /** UI chrome background color */
  chromeBg: string;
  /** UI chrome text color */
  chromeText: string;
  /** UI chrome muted/secondary text */
  chromeMuted: string;
  /** UI chrome border/separator color */
  chromeBorder: string;
  /** UI chrome accent color (links, highlights) */
  chromeAccent: string;
  /** Era toast text color */
  toastColor: string;
  /** Scrubber handle color */
  handleColor: string;
  /** Scrubber histogram bar color */
  histogramColor: string;
}

export const ERA_THEMES: Record<string, EraTheme> = {
  // ── Pre-modern: warm, aged, parchment-like ──────────────────────
  'aged-stone': {
    mapFilter: 'sepia(0.55) brightness(0.75) saturate(0.7) contrast(1.1)',
    tint: 'rgba(120, 95, 55, 0.22)',
    vignette: 'rgba(40, 25, 10, 0.45)',
    chromeBg: 'rgba(55, 42, 28, 0.92)',
    chromeText: '#e8dcc4',
    chromeMuted: '#a08b6e',
    chromeBorder: 'rgba(160, 130, 80, 0.25)',
    chromeAccent: '#d4a857',
    toastColor: '#d4c4a0',
    handleColor: '#d4c4a0',
    histogramColor: 'rgba(220, 180, 80, 0.7)',
  },
  'papyrus': {
    mapFilter: 'sepia(0.45) brightness(0.80) saturate(0.75) contrast(1.05)',
    tint: 'rgba(140, 110, 60, 0.18)',
    vignette: 'rgba(35, 25, 10, 0.38)',
    chromeBg: 'rgba(58, 45, 30, 0.92)',
    chromeText: '#e8dcc8',
    chromeMuted: '#a89070',
    chromeBorder: 'rgba(160, 130, 80, 0.22)',
    chromeAccent: '#d4a857',
    toastColor: '#d4c4a0',
    handleColor: '#d4c4a0',
    histogramColor: 'rgba(220, 180, 80, 0.7)',
  },
  'marble': {
    mapFilter: 'sepia(0.30) brightness(0.85) saturate(0.80) contrast(1.05)',
    tint: 'rgba(150, 135, 100, 0.14)',
    vignette: 'rgba(30, 25, 15, 0.32)',
    chromeBg: 'rgba(50, 45, 35, 0.92)',
    chromeText: '#e4ddd0',
    chromeMuted: '#a09585',
    chromeBorder: 'rgba(150, 135, 100, 0.20)',
    chromeAccent: '#c8a855',
    toastColor: '#d0c5a8',
    handleColor: '#d0c5a8',
    histogramColor: 'rgba(210, 175, 90, 0.65)',
  },
  'parchment': {
    mapFilter: 'sepia(0.25) brightness(0.88) saturate(0.82) contrast(1.02)',
    tint: 'rgba(140, 120, 80, 0.12)',
    vignette: 'rgba(25, 20, 12, 0.28)',
    chromeBg: 'rgba(48, 42, 32, 0.92)',
    chromeText: '#e2dcd0',
    chromeMuted: '#9c9080',
    chromeBorder: 'rgba(140, 120, 80, 0.20)',
    chromeAccent: '#c0a050',
    toastColor: '#ccc0a5',
    handleColor: '#ccc0a5',
    histogramColor: 'rgba(200, 165, 75, 0.65)',
  },

  // ── Transitional: warming down, cooling up ──────────────────────
  'renaissance': {
    mapFilter: 'sepia(0.12) brightness(0.92) saturate(0.88) hue-rotate(5deg)',
    tint: 'rgba(120, 110, 95, 0.08)',
    vignette: 'rgba(20, 18, 15, 0.22)',
    chromeBg: 'rgba(40, 38, 35, 0.92)',
    chromeText: '#ddd8d0',
    chromeMuted: '#908880',
    chromeBorder: 'rgba(120, 110, 95, 0.18)',
    chromeAccent: '#a8a070',
    toastColor: '#c8c0b0',
    handleColor: '#c8c0b0',
    histogramColor: 'rgba(180, 165, 110, 0.6)',
  },

  // ── Modern: cool, bright, aqua-tinted ───────────────────────────
  'industrial': {
    mapFilter: 'brightness(1.0) saturate(0.90) hue-rotate(10deg)',
    tint: 'rgba(80, 100, 130, 0.06)',
    vignette: 'rgba(10, 15, 25, 0.18)',
    chromeBg: 'rgba(28, 34, 48, 0.92)',
    chromeText: '#d0dae8',
    chromeMuted: '#7888a0',
    chromeBorder: 'rgba(80, 110, 150, 0.18)',
    chromeAccent: '#5ba8d0',
    toastColor: '#b0c4d8',
    handleColor: '#b0c4d8',
    histogramColor: 'rgba(80, 160, 230, 0.6)',
  },
  'clean': {
    mapFilter: 'brightness(1.08) saturate(0.92) hue-rotate(15deg)',
    tint: 'rgba(70, 110, 150, 0.05)',
    vignette: 'rgba(8, 12, 22, 0.12)',
    chromeBg: 'rgba(22, 30, 48, 0.92)',
    chromeText: '#d4e0f0',
    chromeMuted: '#708098',
    chromeBorder: 'rgba(70, 110, 160, 0.18)',
    chromeAccent: '#4db8e8',
    toastColor: '#a8c8e0',
    handleColor: '#a8c8e0',
    histogramColor: 'rgba(70, 170, 250, 0.65)',
  },
};
