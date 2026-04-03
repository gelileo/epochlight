import { createContext, useCallback, useState, type ReactNode } from 'react';
import type { Tier, TierContextValue } from './useTier';

const FEATURE_TIERS: Record<string, Tier> = {
  'scrubber-zoom': 'free',
  'knowledge-flow': 'scholar',
  'translated-content': 'scholar',
  'hero-images': 'scholar',
  'mini-cards': 'scholar',
};

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  scholar: 1,
};

export function getRequiredTier(featureId: string): Tier {
  return FEATURE_TIERS[featureId] ?? 'free';
}

export function isFeatureEnabledForTier(tier: Tier, featureId: string): boolean {
  const required = getRequiredTier(featureId);
  return TIER_RANK[tier] >= TIER_RANK[required];
}

export const TierContext = createContext<TierContextValue | null>(null);

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

  const stored = localStorage.getItem('epochlight-tier');
  if (stored === 'scholar') return 'scholar';
  return 'free';
}

export function TierProvider({ children }: { children: ReactNode }) {
  const [tier] = useState<Tier>(readStoredTier);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  const isFeatureEnabled = useCallback(
    (featureId: string) => isFeatureEnabledForTier(tier, featureId),
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
