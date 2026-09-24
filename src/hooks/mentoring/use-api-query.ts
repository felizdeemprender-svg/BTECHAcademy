/**
 * Base compartida de los hooks nuevos (fetch vía API, detrás de flag).
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ApiQueryState<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly enabled: boolean;
  readonly refetch: () => Promise<void>;
}

export function useApiQuery<T>(enabled: boolean, load: () => Promise<T>): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setIsLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  return { data, isLoading: enabled && isLoading, error, enabled, refetch };
}
