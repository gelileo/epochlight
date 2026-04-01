import type { Entry } from '../types';

/**
 * Full-text search across entries with relevance-based ranking.
 * Returns top 10 matches sorted by relevance.
 */
export function searchEntries(query: string, entries: Entry[]): Entry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = trimmed.toLowerCase();

  const scored: { entry: Entry; score: number }[] = [];

  for (const entry of entries) {
    let score = 0;

    const titleLower = entry.title.toLowerCase();

    // Title exact match -> highest priority
    if (titleLower === q) {
      score = 100;
    }
    // Title starts with query
    else if (titleLower.startsWith(q)) {
      score = 80;
    }
    // Title contains query
    else if (titleLower.includes(q)) {
      score = 60;
    }

    // Person name match -> medium priority
    for (const person of entry.persons) {
      if (person.name.toLowerCase().includes(q)) {
        score = Math.max(score, 40);
        break;
      }
    }

    // Tag match -> medium priority
    for (const tag of entry.tags) {
      if (tag.toLowerCase().includes(q)) {
        score = Math.max(score, 40);
        break;
      }
    }

    // Description contains query -> lowest priority
    if (entry.description.toLowerCase().includes(q)) {
      score = Math.max(score, 20);
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map((s) => s.entry);
}
