# Epochlight

An interactive map-based timeline that visualizes the evolution of human knowledge across civilizations — from prehistoric tool-making to modern breakthroughs. Explore 855 curated entries spanning 7 science subjects plus 121 world history events, scrub through time, and follow the threads of discovery as they arc across the globe.

**Live demo:** [gelileo.github.io/epochlight](https://gelileo.github.io/epochlight)

## Features

- **Time travel** — Scroll, drag, or use keyboard arrows to move through 2.6 million years of history
- **Era-adaptive visuals** — The map transforms as you travel: warm parchment tones for ancient eras, clean modern atlas for contemporary
- **7 subjects** — Mathematics, Physics, Chemistry, Medicine & Biology, Engineering & Inventions, Astronomy & Cosmology, Philosophy & Logic
- **Glowing entry nodes** — Color-coded by subject, sized by significance tier, with pulsing selection indicator
- **Connection arcs** — Select an entry to see arcs linking it to related discoveries across space and time
- **Knowledge flow mode** — Toggle to visualize all connections between currently visible entries
- **Ghost nodes** — Connected entries outside the time window appear as dim clickable nodes that jump you to their era
- **Zoom-dependent rendering** — Dots at world zoom, titled mini-cards at regional zoom, with smooth crossfade
- **Side panel** — Full entry details with description, impact, persons, connections, tags, and references
- **World history context layer** — 121 historical events with category icons (war, empire, politics, religion, exploration, trade, culture, revolution)
- **Scrubber zoom** — Click an era label to zoom in for year-by-year precision, with entry tick marks and always-on labels (scholar tier)
- **Internationalization** — UI chrome in English, Chinese, and Spanish; content translations for all 855 entries
- **Google Translate** — Built-in translation via the side panel menu for non-English users
- **Search** — Full-text search across titles, descriptions, persons, and tags (`/` shortcut to focus)
- **Subject filtering** — Toggle subjects on/off via the unified control panel with live entry counts
- **Deep linking** — Full app state encoded in URL hash for shareable views
- **Map labels** — Hidden for ancient eras (no anachronistic modern nations), gradually appearing for modern eras
- **Accessibility** — ARIA roles, screen reader announcements, keyboard navigation, tier shapes for colorblind support
- **Onboarding** — 3-step tooltip walkthrough for first-time visitors

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Deck.gl** — WebGL data visualization layers (entries, connections, cards)
- **Mapbox GL JS** — Vector base map (via react-map-gl)
- **Vite** — Build tooling
- **Python 3** — Build-time data pipeline
- **Vitest** — Testing (37 tests)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Mapbox](https://www.mapbox.com/) public access token (free tier)

### Setup

```bash
git clone https://github.com/gelileo/epochlight.git
cd epochlight
npm install
```

Create `.env.local` with your Mapbox token:

```
VITE_MAPBOX_TOKEN=pk.your_public_token_here
```

### Development

```bash
npm run dev
```

This automatically runs the data pipeline first, then starts Vite on http://localhost:5173.

### Production Build

```bash
npm run build
npx vite preview
```

### Run Tests

```bash
npx vitest run
```

## Data Pipeline

The app fetches its data from the [epochlight-data](https://github.com/gelileo/epochlight-data) repo at build time. A Python script transforms the raw JSON into a single optimized file.

```
epochlight-data (separate repo)         epochlight (this repo)
  data/*.json (855 entries)    --->     scripts/build-data.py
  data/geocoding.json                     |
  data/manifest.json                      v
                                        public/data/epochlight-data.json
```

### How it works

1. Fetches `manifest.json` from the data repo (local sibling or GitHub)
2. Compares content hash with local cache (`.data-cache/`)
3. If unchanged, skips rebuild (instant startup)
4. If changed, fetches all data files, transforms, and caches

### Data source selection

| Scenario | Source |
| --- | --- |
| Local `epochlight-data/` sibling exists | Reads locally (fastest) |
| No sibling directory | Fetches from GitHub |
| `EPOCHLIGHT_DATA_SOURCE=github` | Forces GitHub fetch |
| `EPOCHLIGHT_DATA_SOURCE=local` | Forces local read |

## Era Themes

The app has 7 distinct visual eras, each with its own map style, CSS filter, and UI chrome:

| Era | Years | Map | Visual |
| --- | --- | --- | --- |
| Prehistoric | 2.6M BCE - 3000 BCE | Light + heavy sepia | Warm parchment, no labels |
| Ancient | 3000 BCE - 500 BCE | Light + sepia | Yellowed, no labels |
| Classical | 500 BCE - 500 CE | Light + moderate sepia | Warm marble, no labels |
| Medieval | 500 - 1400 | Light + light sepia | Soft parchment, ocean/continent labels only |
| Early Modern | 1400 - 1700 | Light + slight sepia | Transitional, major labels only |
| Modern | 1700 - 1900 | Outdoors (terrain) | Slightly desaturated, full labels |
| Contemporary | 1900 - present | Outdoors (terrain) | Clean, Google Maps-like, full labels |

## GitHub Pages Deployment

The app deploys automatically to GitHub Pages on push to `main` via the included GitHub Actions workflow.

### Setup

1. Go to **Settings > Pages** in your GitHub repo
2. Set **Source** to **GitHub Actions**
3. Add repository secrets at **Settings > Secrets and variables > Actions**:
   - `VITE_MAPBOX_TOKEN` — your Mapbox public token (`pk.xxx`)
   - `DATA_REPO_TOKEN` — a fine-grained GitHub PAT with **Contents: Read-only** access to `gelileo/epochlight-data` (only needed if the data repo is private)
4. Push to `main` — the workflow builds and deploys automatically

### Manual deploy

You can also trigger a deploy manually from the **Actions** tab using "Run workflow".

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox public access token (`pk.xxx`). Set in `.env.local` for local dev |
| `EPOCHLIGHT_DATA_SOURCE` | No | Force `local` or `github` data source |
| `GITHUB_TOKEN` | No | GitHub PAT for fetching from a private data repo |

### GitHub Actions Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox public token for the production build |
| `DATA_REPO_TOKEN` | If data repo is private | Fine-grained PAT with Contents read access to `epochlight-data` |

## npm Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start dev server (auto-builds data first) |
| `npm run build` | Production build (auto-builds data first) |
| `npm run build:data` | Run data pipeline only |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |
| `npx vitest run` | Run all tests |

## Feature Tiers

The app has a two-tier system: **free** and **scholar**. Scholar-tier features include scrubber zoom (precise mode), knowledge flow arcs, translated content, hero images, and mini-cards.

Since there is no backend or payment system yet, the tier is determined by (in priority order):

1. **URL parameter** `?tier=scholar` or `?tier=free`
2. **localStorage** key `epochlight-tier` (persisted from prior session)
3. **Default:** `free`

### Testing Scholar Features

Append `?tier=scholar` to the URL:

```
http://localhost:5173/?tier=scholar
```

The tier is persisted to localStorage, so you only need to set it once per browser. To reset:

```
http://localhost:5173/?tier=free
```

When the backend is implemented (see [Infrastructure Roadmap](.notes/infrastructure-roadmap.md)), the tier will be determined by a JWT from the auth/payment system.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Scroll wheel` | Travel through time |
| `Left / Right arrows` | Move cursor by 1 year (adaptive per era) |
| `Page Up / Page Down` | Jump to previous/next era |
| `Enter` | Zoom into current era on scrubber (scholar tier) |
| `Escape` | Zoom out of scrubber / close side panel / clear search |
| `/` | Focus search bar |

## Documentation

- [Map Layer Architecture](docs/map-layer-architecture.md) — visual layer stack, rendering behavior, interactions
- [Scrubber Zoom Design](.notes/scrubber-zoom-design.md) — design options and implementation plan
- [Tier System Design](.notes/tier-system-design.md) — two-tier paywall architecture
- [Infrastructure Roadmap](.notes/infrastructure-roadmap.md) — migration plan from static site to cloud-hosted

## License

MIT
