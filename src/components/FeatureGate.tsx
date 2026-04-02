import type { ReactNode } from 'react';
import { useFeature } from '../hooks/useTier';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if the user's tier includes the feature.
 * Otherwise renders the fallback (or nothing).
 */
export default function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { enabled } = useFeature(feature);
  return <>{enabled ? children : fallback}</>;
}
