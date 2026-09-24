/**
 * Identidad — Caso de uso: ficha por id (F1.3).
 * Lógica 1:1 con `GET api/tutors/by-id/[id]`: `users` doc directo,
 * 404 si no existe. Dominio puro: lee por `TutorRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { TutorRepository, TutorSnapshot } from '../tutor-repository';

export const GetTutorByIdInputSchema = z.object({
  id: z.string().min(1, 'id vacío'),
});
export type GetTutorByIdInput = z.infer<typeof GetTutorByIdInputSchema>;

export async function getTutorById(
  repo: TutorRepository,
  rawInput: unknown,
): Promise<Result<{ tutorId: string; tutor: TutorSnapshot }, DomainError>> {
  const parsed = GetTutorByIdInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de consulta inválidos', parsed.error.flatten()));
  }
  const tutor = await repo.findTutorById(parsed.data.id);
  if (!tutor) {
    return err(notFound('Tutor not found'));
  }
  return ok({ tutorId: tutor.id, tutor });
}
