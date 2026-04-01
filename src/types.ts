export interface Person {
  name: string;
  birth_year: number | null;
  death_year: number | null;
  region: string;
}

export interface ConnectionRef {
  id: string;
  title: string;
  subject: string;
}

export interface Entry {
  id: string;
  year: number;
  year_end: number | null;
  year_precision: 'exact' | 'decade' | 'century' | 'millennium' | 'approximate';
  title: string;
  description: string;
  persons: Person[];
  attribution_note: string | null;
  lat: number;
  lng: number;
  civilization: string[];
  subject: Subject;
  secondary_subjects: Subject[];
  tags: string[];
  tier: 1 | 2 | 3;
  impact: string;
  media_hint: 'portrait' | 'diagram' | 'artifact_photo' | 'illustration' | 'manuscript' | 'map' | null;
  connections: ConnectionRef[];
  superseded_by: ConnectionRef | null;
  references: { title: string; url: string }[];
}

export type Subject =
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'medicine-biology'
  | 'inventions-engineering'
  | 'astronomy-cosmology'
  | 'philosophy-logic';

export interface Era {
  id: string;
  label: string;
  start: number;
  end: number;
  style: string;
  windowWidth: number;
}

export interface EpochlightData {
  meta: {
    version: string;
    generated: string;
    entry_count: number;
    year_range: [number, number];
    eras: Era[];
  };
  entries: Entry[];
}

export const SUBJECT_COLORS: Record<Subject, string> = {
  mathematics: '#4A90D9',
  physics: '#E8854A',
  chemistry: '#5CB85C',
  'medicine-biology': '#D94A4A',
  'inventions-engineering': '#D9A84A',
  'astronomy-cosmology': '#8A5CD9',
  'philosophy-logic': '#4ABCD9',
};
