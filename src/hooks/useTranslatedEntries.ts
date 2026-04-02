import { useEffect, useMemo, useState } from 'react';
import type { Entry } from '../types';
import type { Locale } from './useLocale';

interface TranslationMap {
  [entryId: string]: {
    title: string;
    description: string;
    impact: string;
  };
}

const cache: Partial<Record<Locale, TranslationMap>> = {};

/**
 * Fetches and applies translations to entries based on the current locale.
 * English returns entries as-is (no fetch needed).
 * Other locales lazy-load the translation file and merge translated fields.
 */
export function useTranslatedEntries(entries: Entry[], locale: Locale): Entry[] {
  const [translations, setTranslations] = useState<TranslationMap | null>(
    locale === 'en' ? null : (cache[locale] ?? null)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (locale === 'en') {
      setTranslations(null);
      return;
    }

    // Already cached
    if (cache[locale]) {
      setTranslations(cache[locale]!);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/data/translations/${locale}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TranslationMap) => {
        if (!cancelled) {
          cache[locale] = data;
          setTranslations(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`Failed to load translations for ${locale}:`, err);
        if (!cancelled) {
          setTranslations(null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [locale]);

  return useMemo(() => {
    if (!translations || locale === 'en') return entries;

    return entries.map((entry) => {
      const tr = translations[entry.id];
      if (!tr) return entry;

      return {
        ...entry,
        title: tr.title || entry.title,
        description: tr.description || entry.description,
        impact: tr.impact || entry.impact,
      };
    });
  }, [entries, translations, locale]);
}
