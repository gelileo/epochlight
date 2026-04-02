/**
 * Era visual themes — each era has a distinct visual identity.
 *
 * Pre-modern eras: warm, yellowed, rustic (ancient map feel)
 * Modern eras: cool, bright, bluish/aqua (clean atlas feel)
 *
 * The `mapFilter` CSS filter is applied to the entire map container
 * and is the primary lever for the visual shift.
 */

export type MapLabelLevel = 'none' | 'minimal' | 'full';

export interface EraTheme {
  /** Mapbox style URL */
  mapStyle: string;
  /** How much map labeling to show */
  mapLabels: MapLabelLevel;
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

const LIGHT = 'mapbox://styles/mapbox/light-v11';
const OUTDOORS = 'mapbox://styles/mapbox/outdoors-v12';

export const ERA_THEMES: Record<string, EraTheme> = {
  // ── Pre-modern: warm parchment — sepia tones white land into tan ─
  'aged-stone': {
    mapStyle: LIGHT,
    mapLabels: 'none',
    mapFilter: 'sepia(0.7) brightness(0.85) saturate(0.70) contrast(1.25)',
    tint: 'rgba(160, 130, 70, 0.10)',
    vignette: 'rgba(60, 40, 15, 0.25)',
    chromeBg: 'rgba(75, 58, 35, 0.94)',
    chromeText: '#f0e6d0',
    chromeMuted: '#c0a880',
    chromeBorder: 'rgba(200, 170, 100, 0.35)',
    chromeAccent: '#e0b850',
    toastColor: '#e8d8b0',
    handleColor: '#e8d8b0',
    histogramColor: 'rgba(220, 180, 80, 0.7)',
  },
  'papyrus': {
    mapStyle: LIGHT,
    mapLabels: 'none',
    mapFilter: 'sepia(0.6) brightness(0.88) saturate(0.72) contrast(1.18)',
    tint: 'rgba(155, 125, 65, 0.08)',
    vignette: 'rgba(50, 35, 12, 0.20)',
    chromeBg: 'rgba(70, 55, 35, 0.94)',
    chromeText: '#f0e8d2',
    chromeMuted: '#bca578',
    chromeBorder: 'rgba(190, 160, 95, 0.30)',
    chromeAccent: '#ddb548',
    toastColor: '#e5d5a8',
    handleColor: '#e5d5a8',
    histogramColor: 'rgba(220, 180, 80, 0.7)',
  },
  'marble': {
    mapStyle: LIGHT,
    mapLabels: 'none',
    mapFilter: 'sepia(0.45) brightness(0.90) saturate(0.75) contrast(1.15)',
    tint: 'rgba(140, 125, 90, 0.06)',
    vignette: 'rgba(40, 30, 15, 0.16)',
    chromeBg: 'rgba(62, 55, 40, 0.94)',
    chromeText: '#eee8d8',
    chromeMuted: '#b5a890',
    chromeBorder: 'rgba(170, 150, 110, 0.28)',
    chromeAccent: '#d0a848',
    toastColor: '#e0d0a8',
    handleColor: '#e0d0a8',
    histogramColor: 'rgba(210, 175, 90, 0.65)',
  },
  'parchment': {
    mapStyle: LIGHT,
    mapLabels: 'minimal',
    mapFilter: 'sepia(0.35) brightness(0.92) saturate(0.78) contrast(1.10)',
    tint: 'rgba(130, 115, 75, 0.05)',
    vignette: 'rgba(35, 25, 12, 0.14)',
    chromeBg: 'rgba(58, 50, 38, 0.94)',
    chromeText: '#ece5d5',
    chromeMuted: '#b0a088',
    chromeBorder: 'rgba(160, 140, 95, 0.25)',
    chromeAccent: '#c8a448',
    toastColor: '#ddd0a5',
    handleColor: '#ddd0a5',
    histogramColor: 'rgba(200, 165, 75, 0.65)',
  },

  // ── Transitional: warming down, cooling up ──────────────────────
  'renaissance': {
    mapStyle: LIGHT,
    mapLabels: 'minimal',
    mapFilter: 'sepia(0.18) brightness(0.95) saturate(0.85) contrast(1.06)',
    tint: 'rgba(120, 110, 90, 0.04)',
    vignette: 'rgba(25, 20, 12, 0.12)',
    chromeBg: 'rgba(48, 45, 38, 0.94)',
    chromeText: '#e8e2d5',
    chromeMuted: '#a89888',
    chromeBorder: 'rgba(140, 125, 100, 0.22)',
    chromeAccent: '#b8a060',
    toastColor: '#d8d0b5',
    handleColor: '#d8d0b5',
    histogramColor: 'rgba(180, 165, 110, 0.6)',
  },

  // ── Modern: cool, bright, aqua-tinted ───────────────────────────
  'industrial': {
    mapStyle: OUTDOORS,
    mapLabels: 'full',
    mapFilter: 'saturate(0.85) brightness(0.97)',
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
    mapStyle: OUTDOORS,
    mapLabels: 'full',
    mapFilter: 'none',
    tint: 'rgba(0, 0, 0, 0)',
    vignette: 'rgba(0, 0, 0, 0)',
    chromeBg: 'rgba(255, 255, 255, 0.92)',
    chromeText: '#1a1a2e',
    chromeMuted: '#5f6368',
    chromeBorder: 'rgba(0, 0, 0, 0.12)',
    chromeAccent: '#1a73e8',
    toastColor: '#3c4043',
    handleColor: '#1a73e8',
    histogramColor: 'rgba(26, 115, 232, 0.55)',
  },
};
