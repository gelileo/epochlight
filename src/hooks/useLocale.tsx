import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import es from '../locales/es.json';

export type Locale = 'en' | 'zh-CN' | 'es';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '中文',
  es: 'Español',
};

const MESSAGES: Record<Locale, Record<string, string>> = {
  en,
  'zh-CN': zhCN,
  es,
};

const STORAGE_KEY = 'epochlight-locale';

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in MESSAGES) return stored as Locale;

  const lang = navigator.language;
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

/**
 * Translate a key with optional interpolation.
 * Interpolation: t('yearFormat.bce', { year: 300 }) → "300 BCE"
 */
function translate(
  messages: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  let msg = messages[key] ?? en[key as keyof typeof en] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(MESSAGES[locale], key, params),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
