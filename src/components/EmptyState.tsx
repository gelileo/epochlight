interface EmptyStateProps {
  noEntriesInWindow: boolean;
  allSubjectsDisabled: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 100,
  },
  card: {
    background: 'rgba(10, 10, 26, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: '1.25rem 1.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    maxWidth: 360,
    textAlign: 'center' as const,
  },
};

export default function EmptyState({ noEntriesInWindow, allSubjectsDisabled }: EmptyStateProps) {
  if (!noEntriesInWindow && !allSubjectsDisabled) return null;

  const message = allSubjectsDisabled
    ? 'Enable at least one subject to see entries on the map.'
    : 'No entries in this period. Try scrolling forward or enabling more subjects.';

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>{message}</div>
    </div>
  );
}
