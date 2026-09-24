/**
 * Hooks nuevos de campañas (nueva arquitectura, detrás de flag).
 * Con el flag apagado no hacen fetch: las páginas actuales
 * siguen funcionando igual. No escriben datos ni storage.
 */
'use client';

import { useCallback } from 'react';

import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import type { ApiCampaignSummary } from '@/lib/api/dto';
import { fetchCampaignDetail, fetchMentorCampaigns } from '@/lib/api/mentoring-client';

import { useApiQuery, type ApiQueryState } from './use-api-query';

export function useMentorCampaigns(
  mentorId: string | null | undefined,
): ApiQueryState<ApiCampaignSummary[]> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = isNewMentoringApiEnabled() && !authLoading && !!user && !!mentorId;

  const load = useCallback(async () => {
    if (!user || !mentorId) return [];
    const token = await user.getIdToken();
    return fetchMentorCampaigns(mentorId, token);
  }, [user, mentorId]);

  return useApiQuery<ApiCampaignSummary[]>(enabled, load);
}

export function useCampaignDetail(
  id: string | null | undefined,
): ApiQueryState<ApiCampaignSummary> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = isNewMentoringApiEnabled() && !authLoading && !!user && !!id;

  const load = useCallback(async () => {
    if (!user || !id) throw new Error('Sin campaña');
    const token = await user.getIdToken();
    return fetchCampaignDetail(id, token);
  }, [user, id]);

  return useApiQuery<ApiCampaignSummary>(enabled, load);
}
