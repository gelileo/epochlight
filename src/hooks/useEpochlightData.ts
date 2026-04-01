import { useState, useEffect, useCallback } from 'react';
import type { EpochlightData } from '../types';

interface UseEpochlightDataResult {
  data: EpochlightData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEpochlightData(): UseEpochlightDataResult {
  const [data, setData] = useState<EpochlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const response = await fetch('/data/epochlight-data.json');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        const json = (await response.json()) as EpochlightData;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading data');
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return { data, loading, error, refetch };
}
