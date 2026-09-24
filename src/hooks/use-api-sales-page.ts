import { useState, useEffect, useCallback } from 'react';
import type { SalesPage } from '@/domain/catalog';

export function useApiSalesPage(id: string | null) {
  const [data, setData] = useState<SalesPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(async () => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales-pages/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch sales page');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPage
  };
}
