declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

export function trackEvent(name: string, props?: Record<string, string | number>): void {
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(name, { props });
  }
}
