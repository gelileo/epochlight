import React from 'react';
import { useLocale } from '../hooks/useLocale';

interface HistoryToggleProps {
  enabled: boolean;
  onToggle: () => void;
  visibleCount: number;
}

const FLAME = '#FF8C32';
const MUTED = '#6b7280';

const HistoryToggle: React.FC<HistoryToggleProps> = ({ enabled, onToggle, visibleCount }) => {
  const { t } = useLocale();
  const [hovered, setHovered] = React.useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 80,
    left: 16,
    zIndex: 1000,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 20,
    border: `1px solid ${enabled ? FLAME : '#444'}`,
    background: 'var(--chrome-bg, rgba(26, 26, 46, 0.92))',
    color: enabled ? FLAME : MUTED,
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'color 200ms, border-color 200ms, filter 200ms',
    filter: hovered ? 'brightness(1.15)' : 'none',
    userSelect: 'none',
    lineHeight: 1,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 14,
    textShadow: enabled ? `0 0 6px ${FLAME}` : 'none',
    transition: 'text-shadow 200ms',
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={containerStyle}
      aria-pressed={enabled}
      aria-label={`${t('historyToggle.label')}${enabled ? ` - ${visibleCount} visible` : ''}`}
    >
      <span style={iconStyle}>&#x2726;</span>
      <span>
        {t('historyToggle.label')}{enabled && visibleCount > 0 ? ` \u00B7 ${visibleCount}` : ''}
      </span>
    </button>
  );
};

export default HistoryToggle;
