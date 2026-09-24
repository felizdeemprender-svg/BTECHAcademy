import { useState, useEffect, useCallback } from 'react';
import type { SalesPage } from '@/domain/catalog';
import { useAuth } from '@/components/auth-context';

interface UseApiSalesPagesOptions {
  type?: 'all' | 'campaign_pack' | 'landing_only';
  courseId?: string;
  mentorId?: string;
  referidoId?: string;
  skip?: boolean;
}

export function useApiSalesPages(options: UseApiSalesPagesOptions = {}) {
  const [data, setData] = useState<SalesPage[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const fetchPages = useCallback(async () => {
    if (options.skip || authLoading || !user) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (options.type) queryParams.set('type', options.type);
      if (options.courseId) queryParams.set('courseId', options.courseId);
      if (options.mentorId) queryParams.set('mentorId', options.mentorId);
      if (options.referidoId) queryParams.set('referidoId', options.referidoId);

      const res = await fetch(`/api/sales-pages?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('API Error Response:', res.status, text);
        throw new Error(`Failed to fetch sales pages: ${res.status} ${text}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [options.type, options.mentorId, options.skip, user, authLoading]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPages
  };
}
