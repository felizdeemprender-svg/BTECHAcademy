/**
 * Identidad — Casos de uso: tutores destacados y ficha por id (F1.3).
 * Lógica 1:1 con `GET api/tutors/featured` (mapeo id + tutorName con
 * fallback al prefijo del email) y `GET api/tutors/by-id/[id]` (doc
 * directo, 404 si no existe). Dominio puro: lee por `TutorRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';

import type { TutorRepository } from '../tutor-repository';

export const ListFeaturedInputSchema = z.object({
  limit: z.number().int().positive().optional(),
});
export type ListFeaturedInput = z.infer<typeof ListFeaturedInputSchema>;

export interface FeaturedTutorEntry {
  readonly id: string;
  readonly tutorName: string;
  readonly subscription: Record<string, unknown>;
}

function tutorNameOf(data: Record<string, unknown>): string {
  if (typeof data.displayName === 'string' && data.displayName.length > 0) {
    return data.displayName;
  }
  if (typeof data.email === 'string') {
    return data.email.split('@')[0] ?? '';
  }
  return '';
}

export async function listFeaturedTutors(
  repo: TutorRepository,
  rawInput: unknown,
): Promise<Result<{ subscriptions: FeaturedTutorEntry[] }, DomainError>> {
  const parsed = ListFeaturedInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return err(validationError('Parámetros inválidos', parsed.error.flatten()));
  }
  const docs = await repo.listFeaturedTutors(parsed.data.limit ?? 8);
  return ok({
    subscriptions: docs.map((d) => ({
      id: d.id,
      tutorName: tutorNameOf(d.data),
      subscription:
        typeof d.data.subscription === 'object' && d.data.subscription !== null
          ? (d.data.subscription as Record<string, unknown>)
          : {},
    })),
  });
}
