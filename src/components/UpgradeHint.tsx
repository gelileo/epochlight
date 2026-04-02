import { useTier } from '../hooks/useTier';
import { useLocale } from '../hooks/useLocale';

const FEATURE_DESCRIPTIONS: Record<string, { icon: string; titleKey: string; descKey: string }> = {
  'scrubber-zoom': {
    icon: '🔍',
    titleKey: 'upgrade.scrubberZoom.title',
    descKey: 'upgrade.scrubberZoom.desc',
  },
  'knowledge-flow': {
    icon: '🌊',
    titleKey: 'upgrade.knowledgeFlow.title',
    descKey: 'upgrade.knowledgeFlow.desc',
  },
  'translated-content': {
    icon: '🌐',
    titleKey: 'upgrade.translatedContent.title',
    descKey: 'upgrade.translatedContent.desc',
  },
  'hero-images': {
    icon: '🖼️',
    titleKey: 'upgrade.heroImages.title',
    descKey: 'upgrade.heroImages.desc',
  },
  'mini-cards': {
    icon: '🏷️',
    titleKey: 'upgrade.miniCards.title',
    descKey: 'upgrade.miniCards.desc',
  },
};

// Fallback English strings (until locale files are updated with upgrade keys)
const FALLBACKS: Record<string, string> = {
  'upgrade.scrubberZoom.title': 'Scrubber Zoom',
  'upgrade.scrubberZoom.desc': 'Zoom into eras and click individual entries on the timeline.',
  'upgrade.knowledgeFlow.title': 'Knowledge Flow',
  'upgrade.knowledgeFlow.desc': 'Watch animated arcs showing how ideas traveled across civilizations.',
  'upgrade.translatedContent.title': 'Translated Content',
  'upgrade.translatedContent.desc': 'Read entry titles and descriptions in Chinese and Spanish.',
  'upgrade.heroImages.title': 'Hero Images',
  'upgrade.heroImages.desc': 'See historical images from Wikimedia Commons in the detail panel.',
  'upgrade.miniCards.title': 'Mini Cards',
  'upgrade.miniCards.desc': 'See entry titles on the map when zoomed into a region.',
  'upgrade.cta': 'Upgrade — $9.99',
  'upgrade.dismiss': 'Maybe Later',
  'upgrade.badge': 'Scholar Feature',
};

interface UpgradeHintProps {
  feature: string;
}

export default function UpgradeHint({ feature }: UpgradeHintProps) {
  const { dismissUpgrade } = useTier();
  const { t } = useLocale();

  const info = FEATURE_DESCRIPTIONS[feature];
  if (!info) return null;

  const title = t(info.titleKey) !== info.titleKey ? t(info.titleKey) : FALLBACKS[info.titleKey] ?? feature;
  const desc = t(info.descKey) !== info.descKey ? t(info.descKey) : FALLBACKS[info.descKey] ?? '';
  const cta = t('upgrade.cta') !== 'upgrade.cta' ? t('upgrade.cta') : FALLBACKS['upgrade.cta']!;
  const dismiss = t('upgrade.dismiss') !== 'upgrade.dismiss' ? t('upgrade.dismiss') : FALLBACKS['upgrade.dismiss']!;
  const badge = t('upgrade.badge') !== 'upgrade.badge' ? t('upgrade.badge') : FALLBACKS['upgrade.badge']!;

  return (
    <div style={{
      background: 'var(--chrome-bg, rgba(26, 26, 46, 0.95))',
      border: '1px solid rgba(255, 180, 60, 0.3)',
      borderRadius: 10,
      padding: '14px 16px',
      maxWidth: 320,
      fontSize: 13,
      color: 'var(--chrome-text, #ddd)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255, 180, 60, 0.8)', marginBottom: 8 }}>
        ✦ {badge}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {info.icon} {title}
      </div>
      <div style={{ color: 'var(--chrome-muted, #aaa)', lineHeight: 1.5, marginBottom: 12 }}>
        {desc}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            // Phase 2: open Stripe Checkout
            window.alert('Stripe Checkout coming soon!');
          }}
          style={{
            padding: '6px 14px',
            background: 'rgba(255, 180, 60, 0.15)',
            border: '1px solid rgba(255, 180, 60, 0.4)',
            borderRadius: 6,
            color: '#FFB43C',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {cta}
        </button>
        <button
          onClick={dismissUpgrade}
          style={{
            padding: '6px 14px',
            background: 'none',
            border: '1px solid var(--chrome-border, rgba(255,255,255,0.1))',
            borderRadius: 6,
            color: 'var(--chrome-muted, #888)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {dismiss}
        </button>
      </div>
    </div>
  );
}
