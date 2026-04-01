import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import type { EpochlightData } from './types';

// Mock WebGL-dependent modules
vi.mock('@deck.gl/react', () => ({
  default: ({ children }: any) => <div data-testid="deckgl">{children}</div>,
}));

vi.mock('react-map-gl/mapbox', () => ({
  Map: ({ children }: any) => <div data-testid="map">{children}</div>,
  useControl: (factory: any) => {
    const ctrl = factory();
    return { setProps: vi.fn(), ...ctrl };
  },
}));

vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: class MapboxOverlay {
    setProps() {}
  },
}));

vi.mock('@deck.gl/layers', () => ({
  ScatterplotLayer: class ScatterplotLayer {},
  ArcLayer: class ArcLayer {},
  TextLayer: class TextLayer {},
}));

vi.mock('@deck.gl/core', () => ({
  Layer: class Layer {},
}));

// Suppress mapbox-gl CSS import
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

// Polyfill ResizeObserver for jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Polyfill localStorage for jsdom (vitest --localstorage-file not always available)
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}

const mockData: EpochlightData = {
  meta: {
    version: '1.0',
    generated: '2026-03-31',
    entry_count: 5,
    year_range: [-500, 2000],
    eras: [
      { id: 'classical', label: 'Classical Era', start: -500, end: 500, style: 'marble', windowWidth: 100 },
      { id: 'medieval', label: 'Medieval World', start: 500, end: 1400, style: 'parchment', windowWidth: 75 },
      { id: 'modern', label: 'Modern Era', start: 1700, end: 1900, style: 'industrial', windowWidth: 25 },
    ],
  },
  entries: [
    {
      id: 'euclid-elements',
      year: -300,
      year_end: null,
      year_precision: 'decade',
      title: 'Euclid writes the Elements',
      description: 'Foundational text of geometry and number theory.',
      persons: [{ name: 'Euclid', birth_year: -325, death_year: -265, region: 'Alexandria' }],
      attribution_note: null,
      lat: 31.2,
      lng: 29.9,
      civilization: ['Greek'],
      subject: 'mathematics',
      secondary_subjects: [],
      tags: ['geometry'],
      tier: 1,
      impact: 'Defined axiomatic method for mathematics.',
      media_hint: 'manuscript',
      connections: [],
      superseded_by: null,
      references: [{ title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Euclid%27s_Elements' }],
    },
    {
      id: 'ptolemy-almagest',
      year: 150,
      year_end: null,
      year_precision: 'decade',
      title: 'Ptolemy publishes the Almagest',
      description: 'Comprehensive treatise on astronomy.',
      persons: [{ name: 'Ptolemy', birth_year: 100, death_year: 170, region: 'Alexandria' }],
      attribution_note: null,
      lat: 31.2,
      lng: 29.9,
      civilization: ['Roman'],
      subject: 'astronomy-cosmology',
      secondary_subjects: ['mathematics'],
      tags: ['astronomy'],
      tier: 1,
      impact: 'Dominated astronomical thought for 1400 years.',
      media_hint: 'manuscript',
      connections: [{ id: 'euclid-elements', title: 'Euclid writes the Elements', subject: 'mathematics' }],
      superseded_by: null,
      references: [],
    },
    {
      id: 'ibn-sina-canon',
      year: 1025,
      year_end: null,
      year_precision: 'exact',
      title: 'Ibn Sina writes The Canon of Medicine',
      description: 'Encyclopedic medical text used for centuries.',
      persons: [{ name: 'Ibn Sina', birth_year: 980, death_year: 1037, region: 'Persia' }],
      attribution_note: null,
      lat: 32.65,
      lng: 51.68,
      civilization: ['Islamic'],
      subject: 'medicine-biology',
      secondary_subjects: ['chemistry'],
      tags: ['medicine'],
      tier: 1,
      impact: 'Standard medical reference across Europe and the Islamic world.',
      media_hint: 'manuscript',
      connections: [],
      superseded_by: null,
      references: [],
    },
    {
      id: 'newton-principia',
      year: 1687,
      year_end: null,
      year_precision: 'exact',
      title: 'Newton publishes the Principia',
      description: 'Laws of motion and universal gravitation.',
      persons: [{ name: 'Isaac Newton', birth_year: 1643, death_year: 1727, region: 'England' }],
      attribution_note: null,
      lat: 52.2,
      lng: 0.12,
      civilization: ['European'],
      subject: 'physics',
      secondary_subjects: ['mathematics'],
      tags: ['gravity', 'mechanics'],
      tier: 1,
      impact: 'Foundation of classical mechanics.',
      media_hint: 'portrait',
      connections: [{ id: 'euclid-elements', title: 'Euclid writes the Elements', subject: 'mathematics' }],
      superseded_by: null,
      references: [],
    },
    {
      id: 'watt-steam-engine',
      year: 1776,
      year_end: null,
      year_precision: 'exact',
      title: 'Watt perfects the steam engine',
      description: 'Separate condenser dramatically improves efficiency.',
      persons: [{ name: 'James Watt', birth_year: 1736, death_year: 1819, region: 'Scotland' }],
      attribution_note: null,
      lat: 55.86,
      lng: -4.25,
      civilization: ['European'],
      subject: 'inventions-engineering',
      secondary_subjects: ['physics'],
      tags: ['industrial-revolution'],
      tier: 1,
      impact: 'Powered the Industrial Revolution.',
      media_hint: 'artifact_photo',
      connections: [{ id: 'newton-principia', title: 'Newton publishes the Principia', subject: 'physics' }],
      superseded_by: null,
      references: [],
    },
  ],
};

describe('App integration smoke test', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response),
    );
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders the loading screen initially', () => {
    render(<App />);
    expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
  });

  it('loading screen disappears after data loads', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });
  });

  it('renders without crashing after data loads (no error screen)', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });
    // Error screen shows "Something went wrong" - verify it's absent
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    // The DeckGL mock should be rendered (may appear multiple times from prior renders)
    expect(screen.getAllByTestId('map').length).toBeGreaterThan(0);
  });
});
