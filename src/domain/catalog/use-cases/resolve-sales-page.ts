/**
 * Catálogo — Caso de uso: resolver landing por username+slug (F1.3).
 * Lógica 1:1 con `GET api/v/resolve` legacy: 400 sin parámetros, 404 sin
 * tutor, match por mentorId+slug y fallback solo-slug. Dominio puro.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';
import type { TutorRepository } from '../../identity/tutor-repository';
import { legacyHttpError } from '@/domain/commerce/use-cases/legacy-response';

import type { MarketplaceRepository } from '../marketplace-repository';

export const ResolveSalesPageInputSchema = z.object({
  username: z.string().optional(),
  slug: z.string().optional(),
});
export type ResolveSalesPageInput = z.infer<typeof ResolveSalesPageInputSchema>;

export type SalesPageResolverSource = Pick<
  MarketplaceRepository,
  'findSalesPageByMentorAndSlug' | 'findSalesPageBySlug'
>;

export async function resolveSalesPage(
  tutors: Pick<TutorRepository, 'findTutorByUsername'>,
  pages: SalesPageResolverSource,
  rawInput: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = ResolveSalesPageInputSchema.safeParse(rawInput);
  const username = parsed.success ? (parsed.data.username ?? '') : '';
  const slug = parsed.success ? (parsed.data.slug ?? '') : '';
  if (!username || !slug) {
    return err(legacyHttpError(400, { error: 'Missing parameters' }));
  }

  const tutor = await tutors.findTutorByUsername(username);
  if (!tutor) {
    return err(legacyHttpError(404, { error: 'Tutor not found' }));
  }

  const page = await pages.findSalesPageByMentorAndSlug(tutor.id, slug);
  if (page) {
    return ok({ id: page.id });
  }

  const fallback = await pages.findSalesPageBySlug(slug);
  if (!fallback) {
    return err(legacyHttpError(404, { error: 'Page not found' }));
  }
  return ok({ id: fallback.id });
}
