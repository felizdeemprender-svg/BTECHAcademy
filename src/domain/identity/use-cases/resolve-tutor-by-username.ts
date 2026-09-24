/**
 * Identidad — Caso de uso: resolver tutor por username (F1.3).
 * Lógica 1:1 con la primera lectura de `GET api/tutors/[username]/status`
 * y `GET api/v/resolve`: `users` username== (limit 1), 404 si vacío.
 * Dominio puro: lee por `TutorRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { TutorRepository, TutorSnapshot } from '../tutor-repository';

export const ResolveTutorByUsernameInputSchema = z.object({
  username: z.string().min(1, 'username vacío'),
});
export type ResolveTutorByUsernameInput = z.infer<typeof ResolveTutorByUsernameInputSchema>;

export interface ResolvedTutor {
  readonly tutorId: string;
  readonly tutor: TutorSnapshot;
}

export async function resolveTutorByUsername(
  repo: TutorRepository,
  rawInput: unknown,
): Promise<Result<ResolvedTutor, DomainError>> {
  const parsed = ResolveTutorByUsernameInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de consulta inválidos', parsed.error.flatten()));
  }
  const tutor = await repo.findTutorByUsername(parsed.data.username);
  if (!tutor) {
    return err(notFound('Tutor not found'));
  }
  return ok({ tutorId: tutor.id, tutor });
}
