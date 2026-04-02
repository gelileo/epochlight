import { useLocale } from '../hooks/useLocale';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    background: '#0a0a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  title: {
    color: '#ffffff',
    fontSize: '2rem',
    letterSpacing: '0.3em',
    fontWeight: 300,
    marginBottom: '2.5rem',
    fontFamily: 'inherit',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '2px solid rgba(255, 255, 255, 0.15)',
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '50%',
    animation: 'epochlight-spin 1s linear infinite',
    marginBottom: '1.5rem',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
  },
};

export default function LoadingScreen() {
  const { t } = useLocale();
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes epochlight-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.title}>{t('loading.title')}</div>
      <div style={styles.spinner} />
      <div style={styles.subtitle}>{t('loading.message')}</div>
    </div>
  );
}
