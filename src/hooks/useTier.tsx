import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Tier = 'free' | 'scholar';

const FEATURE_TIERS: Record<string, Tier> = {
  'scrubber-zoom': 'scholar',
  'knowledge-flow': 'scholar',
  'translated-content': 'scholar',
  'hero-images': 'scholar',
  'mini-cards': 'scholar',
};

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  scholar: 1,
};

function getRequiredTier(featureId: string): Tier {
  return FEATURE_TIERS[featureId] ?? 'free';
}

interface TierContextValue {
  tier: Tier;
  isFeatureEnabled: (featureId: string) => boolean;
  showUpgrade: () => void;
  upgradeVisible: boolean;
  dismissUpgrade: () => void;
}

const TierContext = createContext<TierContextValue | null>(null);

/**
 * Determines the user's tier. Checked in order:
 * 1. URL parameter ?tier=scholar (for testing/preview links)
 * 2. localStorage 'epochlight-tier' (persisted from prior session)
 * 3. Default: 'free'
 *
 * If the URL sets a tier, it's also persisted to localStorage so it
 * survives page navigation within the session.
 * Phase 2 will validate a JWT from the backend instead.
 */
function readStoredTier(): Tier {
  // Check URL parameter first
  const params = new URLSearchParams(window.location.search);
  const urlTier = params.get('tier');
  if (urlTier === 'scholar') {
    localStorage.setItem('epochlight-tier', 'scholar');
    return 'scholar';
  }
  if (urlTier === 'free') {
    localStorage.setItem('epochlight-tier', 'free');
    return 'free';
  }

  // Fall back to localStorage
  const stored = localStorage.getItem('epochlight-tier');
  if (stored === 'scholar') return 'scholar';
  return 'free';
}

export function TierProvider({ children }: { children: ReactNode }) {
  const [tier] = useState<Tier>(readStoredTier);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  const isFeatureEnabled = useCallback(
    (featureId: string) => {
      const required = getRequiredTier(featureId);
      return TIER_RANK[tier] >= TIER_RANK[required];
    },
    [tier],
  );

  const showUpgrade = useCallback(() => {
    setUpgradeVisible(true);
  }, []);

  const dismissUpgrade = useCallback(() => {
    setUpgradeVisible(false);
  }, []);

  return (
    <TierContext.Provider value={{ tier, isFeatureEnabled, showUpgrade, upgradeVisible, dismissUpgrade }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used within TierProvider');
  return ctx;
}

/**
 * Convenience hook for checking a single feature.
 */
export function useFeature(featureId: string): { enabled: boolean; requiredTier: Tier } {
  const { isFeatureEnabled } = useTier();
  return {
    enabled: isFeatureEnabled(featureId),
    requiredTier: getRequiredTier(featureId),
  };
}
