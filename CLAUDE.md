# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Epochlight** is an interactive timeline-map web app visualizing the evolution of human knowledge across civilizations. 855 curated entries span 7 science subjects + 121 world history events, rendered on a Mapbox map with deck.gl layers.

Two-repo setup:
- **epochlight** (this repo) — React SPA + build pipeline
- **epochlight-data** (sibling repo) — curated JSON datasets, translations, validation scripts

## Tech Stack

- React 19 + TypeScript + Vite 8
- deck.gl 9 (ScatterplotLayer, ArcLayer, IconLayer, TextLayer) + Mapbox GL JS (via react-map-gl)
- Python 3 build-time data pipeline (`scripts/build-data.py`)
- Vitest for testing
- GitHub Pages deployment via GitHub Actions

## Common Commands

```bash
npm run dev          # Start dev server (auto-runs data pipeline)
npm run build        # Production build (tsc + vite build)
npm run build:data   # Run data pipeline only
npx vitest run       # Run tests
npx tsc --noEmit     # Type-check without emitting
```

## Project Structure

```
src/
  App.tsx                    # Main component — wires hooks, layers, UI
  main.tsx                   # Entry point — TierProvider > LocaleProvider > App
  types.ts                   # Entry, Era, Subject, HistoryCategory types
  constants/
    subjects.ts              # FILTERABLE_SUBJECTS, ALL_SUBJECTS, SUBJECT_LOCALE_KEYS
  hooks/
    useAppState.ts           # Core state: year, selected entry, enabled subjects
    useUrlState.ts           # URL hash <-> state sync (deep linking)
    useLocale.tsx             # i18n context (en, zh-CN, es)
    useTier.tsx               # Tier hooks (useTier, useFeature)
    TierProvider.tsx          # Tier context provider + tier detection logic
    useTranslatedEntries.ts   # Lazy-loads content translations by locale
    useEpochlightData.ts      # Fetches main data JSON
    useEraTheme.ts            # Era-adaptive CSS custom properties
  layers/
    EntryLayer.ts             # Science entry dots (ScatterplotLayer)
    EntryCardLayer.ts         # Floating text labels (TextLayer)
    HistoryLayer.ts           # History category icons (IconLayer)
    ConnectionLayer.ts        # Knowledge flow arcs (ArcLayer)
  components/
    MapView.tsx               # Mapbox map + deck.gl overlay + era label control
    ScrubberBar.tsx           # Timeline scrubber with zoom + entry ticks
    SidePanel.tsx             # Entry detail panel
    ControlPanel.tsx          # Subjects, history toggle, language, search
    EraOverlay.tsx            # Era tint/vignette + transition toast
    HistoryTicker.tsx         # Rolling text ticker for history entries
    UpgradeHint.tsx           # Scholar tier upgrade prompt
    FeatureGate.tsx           # Declarative tier gate component
  utils/
    timeWindow.ts             # Time window opacity + era lookup
    scrubberScale.ts          # Piecewise scrubber scale + zoom functions
    colorUtils.ts             # hexToRgb, zoom opacity, isEntryVisible
    formatUtils.ts            # formatYear, formatSubject
    historyIconAtlas.ts       # Canvas-generated category icon sprite atlas
    search.ts                 # Full-text entry search
scripts/
  build-data.py               # Data pipeline: fetch, geocode, denormalize, merge translations
```

## Architecture Notes

### Layer Rendering
All deck.gl layers are created via factory functions (`createEntryLayers`, etc.) wrapped in `useMemo` in `App.tsx`. The composition order (bottom to top): connection arcs → history icons → entry dots → text labels. See `docs/map-layer-architecture.md` for full details.

### State Management
- `useAppState` — reducer-style hook for core state (year, selection, subjects, toggles)
- `useUrlState` — syncs state to/from URL hash for deep linking
- `useTier` — reads tier from URL param `?tier=` or localStorage
- `useLocale` — i18n context with `t()` function, persists to localStorage

### Feature Tiers
Two tiers: `free` and `scholar`. Feature-to-tier mapping in `TierProvider.tsx`. Tier determined by `?tier=scholar` URL param or `localStorage('epochlight-tier')`. Use `FeatureGate` component or `useFeature` hook to gate features.

### Time Window
Entries fade based on distance from cursor year. Each era defines a `windowWidth`. In "precise mode" (scrubber zoomed), window is forced to ±1 year. The opacity function: 1.0 within ±W, 0.2 within ±2W, 0.0 beyond.

### Data Pipeline
`build-data.py` fetches from sibling `epochlight-data/` dir (local) or GitHub API (CI). It geocodes entries, denormalizes connections, and merges per-subject translation files into one per language. Output: `public/data/epochlight-data.json` + `public/data/translations/{lang}.json`.

### Translations
- **UI chrome**: `src/locales/{en,zh-CN,es}.json` — static, bundled
- **Entry content**: `public/data/translations/{lang}.json` — lazy-loaded by `useTranslatedEntries` when locale != English
- Source of truth: `epochlight-data/translations/{lang}/{subject}.json`
- Generated by `epochlight-data/scripts/translate.py` using Gemini 2.5 Flash API

## Conventions

- All inline styles (no CSS-in-JS library); some `.css` files for complex components
- Factory functions for deck.gl layers, not React components wrapping deck.gl
- Shared constants in `src/constants/`, shared utils in `src/utils/`
- `FILTERABLE_SUBJECTS` (7 science subjects) vs `ALL_SUBJECTS` (+ world-history) — world-history is a context layer toggle, not a subject filter
- History entries have a `category` field (war, empire, politics, religion, exploration, trade, culture, revolution) used for icon rendering

## Things to Watch Out For

- **Hooks before early returns**: `App.tsx` has early returns for loading/error states. All `useMemo`/`useCallback`/etc. must be before these returns.
- **`BASE_URL` for fetch paths**: Use `import.meta.env.BASE_URL` prefix for any runtime fetch to `public/` assets — the app deploys to `/epochlight/` on GitHub Pages.
- **Translation sync**: When entries in `epochlight-data/data/*.json` are added or modified, translations must be regenerated. See memory file for workflow details.
- **Icon atlas is canvas-generated**: `historyIconAtlas.ts` draws icons programmatically at runtime. No external image files are loaded for history markers.
- **Scrubber zoom**: When zoomed, `effectiveWindowWidth` is forced to 1 (precise mode), and `preciseMode` flag enables always-on labels. The zoom state is lifted to `App.tsx` via `onZoomChange` callback.
