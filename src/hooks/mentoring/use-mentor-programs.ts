/**
 * Hooks nuevos de programas de mentoría (nueva arquitectura, detrás de flag).
 * Con el flag apagado no hacen fetch: las páginas actuales
 * siguen funcionando igual. No escriben datos ni storage.
 */
'use client';

import { useCallback } from 'react';

import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import type { ApiProgramSummary } from '@/lib/api/dto';
import { fetchAllPrograms, fetchMentorPrograms } from '@/lib/api/mentoring-client';
import { useApiQuery, type ApiQueryState } from './use-api-query';

export function useMentorPrograms(
  mentorId: string | null | undefined,
): ApiQueryState<ApiProgramSummary[]> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = isNewMentoringApiEnabled() && !authLoading && !!user && !!mentorId;

  const load = useCallback(async () => {
    if (!user || !mentorId) return [];
    const token = await user.getIdToken();
    return fetchMentorPrograms(mentorId, token);
  }, [user, mentorId]);

  return useApiQuery<ApiProgramSummary[]>(enabled, load);
}

/** Todos los programas (solo admin, detrás de flag). */
export function useAllPrograms(enabledFlag = true): ApiQueryState<ApiProgramSummary[]> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = enabledFlag && isNewMentoringApiEnabled() && !authLoading && !!user;

  const load = useCallback(async () => {
    if (!user) return [];
    const token = await user.getIdToken();
    return fetchAllPrograms(token);
  }, [user]);

  return useApiQuery<ApiProgramSummary[]>(enabled, load);
}
