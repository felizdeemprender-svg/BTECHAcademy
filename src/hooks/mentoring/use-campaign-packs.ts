/**
 * Hook nuevo de packs orquestables (nueva arquitectura, detrás de flag).
 * Con el flag apagado no hace fetch. No escribe datos ni storage.
 */
'use client';

import { useCallback } from 'react';

import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import type { ApiSalesPage } from '@/lib/api/dto';
import { fetchCampaignPacks } from '@/lib/api/mentoring-client';
import { useApiQuery, type ApiQueryState } from './use-api-query';

export function useCampaignPacks(
  mentorId: string | null | undefined,
): ApiQueryState<ApiSalesPage[]> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = isNewMentoringApiEnabled() && !authLoading && !!user && !!mentorId;

  const load = useCallback(async () => {
    if (!user || !mentorId) return [];
    const token = await user.getIdToken();
    return fetchCampaignPacks(mentorId, token);
  }, [user, mentorId]);

  return useApiQuery<ApiSalesPage[]>(enabled, load);
}
