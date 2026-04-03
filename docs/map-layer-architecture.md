# Map Layer Architecture

Epochlight renders an interactive timeline-map by compositing a Mapbox base map with multiple deck.gl overlay layers. This document describes every visual layer, its rendering behavior, and how they interact.

---

## Layer Stack (Bottom to Top)

```
 Z  Layer                        Type               Source File
 -  --------------------------   -----------------  --------------------------
 0  Mapbox base map              Mapbox GL          MapView.tsx
 1  Connection arcs              ArcLayer           ConnectionLayer.ts
 1b Ghost nodes                  ScatterplotLayer   ConnectionLayer.ts
 2  History glow                 ScatterplotLayer   HistoryLayer.ts
 2b History icons                IconLayer          HistoryLayer.ts
 2c History pulse                ScatterplotLayer   HistoryLayer.ts
 3  Entry pulse                  ScatterplotLayer   EntryLayer.ts
 3b Entry glow                   ScatterplotLayer   EntryLayer.ts
 3c Entry dots                   ScatterplotLayer   EntryLayer.ts
 4  Entry card halo              TextLayer          EntryCardLayer.ts
 4b Entry card text              TextLayer          EntryCardLayer.ts
 -  --------------------------   -----------------  --------------------------
    Era overlay (CSS)            HTML overlay        EraOverlay.tsx
    Hover tooltip (CSS)          HTML overlay        MapView.tsx
```

The composition order is defined in `App.tsx`:

```typescript
const allLayers = [...connectionLayers, ...historyLayers, ...entryLayers, ...entryCardLayers];
```

---

## Layer 0: Mapbox Base Map

**File:** `MapView.tsx`

The base map provides geography, borders, and place labels. Its appearance adapts to the current era.

| Property | Value |
|----------|-------|
| Default style | `mapbox://styles/mapbox/light-v11` |
| Modern era style | `mapbox://styles/mapbox/outdoors-v12` |
| Initial view | lat 35, lng 20, zoom 2 (roughly centered on Mediterranean) |
| Projection | Mercator |

### Label Visibility by Era

The `applyLabelLevel()` function dynamically shows/hides Mapbox symbol layers:

| Level | Behavior | Used by eras |
|-------|----------|-------------|
| `none` | All text labels hidden — pure geographic map | aged-stone, papyrus, marble |
| `minimal` | Only continent/ocean/sea labels visible | parchment, renaissance |
| `full` | All labels shown normally | industrial, clean |

### Era Visual Theming

Each era applies a CSS filter to the map container and a color tint overlay:

| Era Style | CSS Filter | Map Style |
|-----------|-----------|-----------|
| aged-stone | sepia(0.7) brightness(0.85) saturate(0.70) | light-v11 |
| papyrus | sepia(0.6) brightness(0.88) saturate(0.72) | light-v11 |
| marble | sepia(0.45) brightness(0.90) saturate(0.75) | light-v11 |
| parchment | sepia(0.35) brightness(0.92) saturate(0.78) | light-v11 |
| renaissance | sepia(0.18) brightness(0.95) saturate(0.85) | light-v11 |
| industrial | saturate(0.85) brightness(0.97) | outdoors-v12 |
| clean | none | outdoors-v12 |

The `EraOverlay` component renders a tint layer (CSS multiply blend) and a radial vignette on top of the map, plus a fade-in toast label when the era changes.

---

## Layer 1: Connection Arcs

**File:** `ConnectionLayer.ts`

Renders curved arcs between related entries to visualize knowledge flow and dependencies.

### 1a. ArcLayer — `connection-arcs` / `knowledge-flow-arcs`

| Property | Value |
|----------|-------|
| Visible when | `showKnowledgeFlow` enabled, OR an entry is selected |
| Data | Pairs of connected entries (source/target) |
| Color | Subject color of source/target, converted via `hexToRgb` |
| Width | 2px |
| Pickable | No |

In **knowledge flow mode**, arcs are chronologically directed (earlier entry -> later entry), deduplicated, and only shown for entries within the time window.

In **selected entry mode**, arcs connect the selected entry to all its `connections[]` entries, including those outside the time window.

### 1b. ScatterplotLayer — `connection-ghost-nodes`

| Property | Value |
|----------|-------|
| Visible when | Selected entry has connections outside the time window |
| Radius | 4px |
| Color | Subject color at 10% opacity |
| Pickable | Yes — click jumps timeline to that entry's year |

Ghost nodes are faint dots that appear at the position of connected entries that are currently outside the time window. Clicking one teleports the cursor to that entry's year.

---

## Layer 2: History Context Overlay

**File:** `HistoryLayer.ts`

Renders world-history entries as category-specific icons with a glow backdrop and selection pulse. Only visible when the context layer toggle is on.

### 2a. ScatterplotLayer — `history-glow`

Soft amber glow behind each history icon for visual prominence.

| Property | Value |
|----------|-------|
| Radius | ICON_SIZE (36px), enlarged 1.3x when selected |
| Color | `FLAME_INNER` [255, 180, 60] at 25% opacity |
| Pickable | No |

### 2b. IconLayer — `history-icons`

Category-specific icons rendered from a programmatically generated canvas sprite atlas.

| Property | Value |
|----------|-------|
| Atlas | Canvas-generated at runtime (`historyIconAtlas.ts`), 128px per icon |
| Categories | war, empire, politics, religion, exploration, trade, culture, revolution |
| Icon size | 36px uniform (enlarged 1.3x when selected) |
| Color tint | White [255, 255, 255] — category colors baked into atlas |
| Pickable | Yes — click selects entry, hover shows tooltip |

**Category Color Palette:**

| Category | Color | Hex |
|----------|-------|-----|
| War | Red | #DC2626 |
| Empire | Amber/gold | #F59E0B |
| Politics | Blue | #3B82F6 |
| Religion | Purple | #A855F7 |
| Exploration | Cyan | #06B6D4 |
| Trade | Green | #22C55E |
| Culture | Pink | #EC4899 |
| Revolution | Bright red-orange | #EF4444 |

### 2c. ScatterplotLayer — `history-pulse`

Pulsing ring around the selected history entry.

| Property | Value |
|----------|-------|
| Visible when | A world-history entry is selected |
| Animation | Sine wave: radius oscillates 1.0x–1.8x, alpha oscillates 0.7–0 |
| Stroke color | `FLAME_OUTER` [224, 80, 32] |
| Stroke width | 2px |
| Pickable | No |

---

## Layer 3: Entry Dots (Science Entries)

**File:** `EntryLayer.ts`

Renders the main science/knowledge entries as colored dots, sized by tier.

### Tier System

| Tier | Meaning | Radius |
|------|---------|--------|
| 1 | Undeniable milestone | 12px |
| 2 | Essential context | 8px |
| 3 | Rich texture | 5px |

Selected entries are 1.5x larger.

### 3a. ScatterplotLayer — `entry-glow`

| Property | Value |
|----------|-------|
| Radius | 2x base tier radius |
| Color | Subject color at 30% opacity |
| Pickable | No |

### 3b. ScatterplotLayer — `entry-main`

| Property | Value |
|----------|-------|
| Radius | Base tier radius |
| Color | Subject color at full saturation, opacity from time window |
| Stroke | Tier 1 only: white ring (2px) at 20% opacity |
| Pickable | Yes — click selects, hover shows tooltip |

### 3c. ScatterplotLayer — `entry-pulse`

| Property | Value |
|----------|-------|
| Visible when | An entry is selected |
| Animation | Sine wave: radius 1.8x–3x, alpha 0–0.7 |
| Stroke color | Subject color |
| Pickable | No |

### Subject Color Palette

Colors are defined in `types.ts` as `SUBJECT_COLORS`:

| Subject | Color |
|---------|-------|
| Mathematics | #4A90D9 |
| Physics | #E8913A |
| Chemistry | #5BAA68 |
| Medicine & Biology | #C75B8E |
| Inventions & Engineering | #8B6ABF |
| Astronomy & Cosmology | #D4A843 |
| Philosophy & Logic | #6BAFAF |
| World History | #C0956C |

---

## Layer 4: Entry Card Labels

**File:** `EntryCardLayer.ts`

Floating text labels that appear above entry dots when the map is zoomed in, showing the entry title prefixed with a media-hint emoji icon.

### Media Hint Icons

| Hint | Emoji |
|------|-------|
| portrait | `portrait` |
| diagram | `triangular_ruler` |
| artifact_photo | `amphora` |
| illustration | `art` |
| manuscript | `scroll` |
| map | `world_map` |
| default | `bulb` |

### 4a. TextLayer — `entry-card-halo`

White background pill behind the text for contrast on any map theme.

| Property | Value |
|----------|-------|
| Font | system-ui, bold, 13px |
| Color | White [255, 255, 250] at 85% opacity |
| Outline | 8px white — creates pill-shaped background |
| Billboard | Yes (always faces camera) |
| Pickable | No |

### 4b. TextLayer — `entry-card-text`

Dark text rendered on top of the halo.

| Property | Value |
|----------|-------|
| Font | system-ui, bold, 13px |
| Color | Dark [25, 20, 15] |
| Billboard | Yes |
| Pickable | Yes — click selects, hover shows tooltip |

### Precise Mode

When the scrubber is zoomed into an era ("precise mode"), card labels are always visible regardless of map zoom level, and world-history entries are included in the label layer. This lets users see entry titles as they scrub year-by-year.

---

## Crossfade System

Two opacity functions create a smooth transition between dots and labels as the user zooms the map. Defined in `colorUtils.ts`:

```
Map zoom:   1    2    3    4    5    6    7    8
Dots:      |████████████████|████▓▓▓▓░░░░|        |
Cards:     |                |    ░░░░▓▓▓▓|████████|
```

| Function | Formula | Effect |
|----------|---------|--------|
| `getDotOpacityAtZoom(z)` | clamp((6 - z) / 2) | Full at z <= 4, gone at z >= 6 |
| `getCardOpacityAtZoom(z)` | clamp((z - 4) / 2) | Gone at z <= 4, full at z >= 6 |

At zoom 4–6, both dots and labels are partially visible, creating a smooth handoff.

---

## Time Window System

**File:** `timeWindow.ts`

Each era defines a `windowWidth` that controls how many years of entries are visible around the cursor. The opacity function creates three zones:

```
Opacity:  0.0    0.2         1.0         0.2    0.0
          |------|-----------|-----------|------|
       -2W      -W        cursor       +W     +2W
```

| Zone | Distance from cursor | Opacity |
|------|---------------------|---------|
| Active | <= windowWidth | 1.0 (full) |
| Fade | <= 2 x windowWidth | 0.2 (faded) |
| Hidden | > 2 x windowWidth | 0.0 (invisible) |

In **precise mode** (scrubber zoomed), `windowWidth` is forced to 1 year, so only entries at the exact cursor year are fully visible.

---

## Interaction Summary

| Layer | Click | Hover | Scroll |
|-------|-------|-------|--------|
| Base map | (native Mapbox) | — | Year change (via MapView wheel handler) |
| Connection arcs | — | — | — |
| Ghost nodes | Jump to entry year | — | — |
| History icons | Select entry | Show tooltip | — |
| Entry dots | Select entry | Show tooltip | — |
| Entry card text | Select entry | Show tooltip | — |
| History/Entry pulse | — | — | — |

The hover tooltip is an HTML overlay in `MapView.tsx`, positioned at the cursor with entry title and year.

---

## Conditional Rendering

| Layer | Conditions |
|-------|-----------|
| Connection arcs | `showKnowledgeFlow` OR `selectedEntryId` exists |
| Ghost nodes | Selected entry has out-of-window connections |
| History layers | `showContextLayer` enabled AND `getDotOpacityAtZoom > 0` |
| Entry dots | Entries in window AND `getDotOpacityAtZoom > 0` |
| Entry cards | Entries in window AND (`getCardOpacityAtZoom > 0` OR precise mode) |
| Entry/History pulse | Respective entry type is selected |

---

## Performance Notes

- All four layer factory calls are wrapped in `useMemo` in `App.tsx` — recomputed only when dependencies change, not on every render frame.
- Glow and pulse layers are non-pickable, reducing hit-test computation.
- The history icon atlas is generated once (canvas -> data URL) and cached at module level.
- deck.gl's internal `updateTriggers` mechanism ensures GPU data is only re-uploaded when specific properties change.
