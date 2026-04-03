import { useContext } from 'react';
import { TierContext, getRequiredTier } from './TierProvider';

export type Tier = 'free' | 'scholar';

export interface TierContextValue {
  tier: Tier;
  isFeatureEnabled: (featureId: string) => boolean;
  showUpgrade: () => void;
  upgradeVisible: boolean;
  dismissUpgrade: () => void;
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
