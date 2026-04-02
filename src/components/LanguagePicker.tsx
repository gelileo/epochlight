import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale, LOCALE_LABELS, type Locale } from '../hooks/useLocale';

const LOCALES = Object.keys(LOCALE_LABELS) as Locale[];

export default function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (l: Locale) => {
      setLocale(l);
      setOpen(false);
    },
    [setLocale],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'fixed', top: 16, right: 16, zIndex: 1100 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        style={{
          background: 'var(--chrome-bg, rgba(26, 26, 46, 0.92))',
          border: '1px solid var(--chrome-border, rgba(255,255,255,0.12))',
          borderRadius: 8,
          color: 'var(--chrome-text, #ddd)',
          fontSize: 13,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'border-color 200ms',
        }}
      >
        <span style={{ fontSize: 15 }}>🌐</span>
        <span>{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            background: 'var(--chrome-bg, rgba(26, 26, 46, 0.96))',
            border: '1px solid var(--chrome-border, rgba(255,255,255,0.12))',
            borderRadius: 8,
            padding: 4,
            minWidth: 130,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: l === locale ? 'rgba(128,128,128,0.15)' : 'none',
                border: 'none',
                borderRadius: 6,
                color: 'var(--chrome-text, #ddd)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
