/**
 * Hook nuevo del detalle del programa (nueva arquitectura, detrás de flag).
 * Programa + sesiones + tareas vía API en paralelo.
 * Con el flag apagado no hace fetch. No escribe datos ni storage.
 */
'use client';

import { useCallback } from 'react';

import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import {
  fetchProgramDetail,
  fetchProgramSessions,
  fetchProgramTasks,
  type ApiSession,
  type ApiTask,
} from '@/lib/api/mentoring-client';
import { useApiQuery, type ApiQueryState } from './use-api-query';

export interface ProgramDetailData {
  readonly program: any | null;
  readonly sessions: ApiSession[];
  readonly tasks: ApiTask[];
}

export function useProgramDetail(
  programId: string | null | undefined,
): ApiQueryState<ProgramDetailData> {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = isNewMentoringApiEnabled() && !authLoading && !!user && !!programId;

  const load = useCallback(async (): Promise<ProgramDetailData> => {
    if (!user || !programId) {
      return { program: null, sessions: [], tasks: [] };
    }
    const token = await user.getIdToken();
    const [program, sessions, tasks] = await Promise.all([
      fetchProgramDetail(programId, token),
      fetchProgramSessions(programId, token),
      fetchProgramTasks(programId, token),
    ]);
    return { program, sessions, tasks };
  }, [user, programId]);

  return useApiQuery<ProgramDetailData>(enabled, load);
}
