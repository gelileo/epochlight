interface ErrorScreenProps {
  onRetry: () => void;
}

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
  icon: {
    fontSize: '3rem',
    marginBottom: '1.5rem',
  },
  message: {
    color: '#ffffff',
    fontSize: '1.25rem',
    fontWeight: 500,
    marginBottom: '0.75rem',
  },
  subMessage: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.9rem',
    marginBottom: '2rem',
  },
  button: {
    color: '#ffffff',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    borderRadius: 6,
    padding: '0.6rem 1.8rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'background 0.2s, border-color 0.2s',
  },
};

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>⚠️</div>
      <div style={styles.message}>Couldn't load timeline data</div>
      <div style={styles.subMessage}>Check your connection and try again.</div>
      <button
        style={styles.button}
        onClick={onRetry}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        }}
      >
        Retry
      </button>
    </div>
  );
}
