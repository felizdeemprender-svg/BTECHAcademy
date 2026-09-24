/**
 * Marketing — Caso de uso: packs orquestables de un mentor.
 * Filtra `landing_only` (igual que las páginas actuales) y ordena
 * por creación descendente. Repositorio inyectado.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';
import { sortByCreatedAtDesc } from '@/domain/shared/sort';
import {
  isCampaignPack,
  type SalesPage,
  type SalesPageRepository,
} from '@/domain/catalog';

export interface ListCampaignPacksInput {
  readonly mentorId: string;
}

export async function listCampaignPacks(
  repo: SalesPageRepository,
  input: ListCampaignPacksInput,
): Promise<Result<SalesPage[], DomainError>> {
  if (input.mentorId.trim() === '') {
    return err(validationError('mentorId vacío'));
  }
  const pages = await repo.listByMentor(input.mentorId);
  return ok(sortByCreatedAtDesc(pages.filter(isCampaignPack)));
}
