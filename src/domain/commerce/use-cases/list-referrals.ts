/**
 * Comercio — Caso de uso: listar referidos con stats (F1.3).
 * Lógica 1:1 con `GET api/influencers/list` legacy: 400 sin mentorUid,
 * `{ influencers: [] }` sin referidos, landings del mentor filtradas por
 * referido (`salesPages` mentorId==), leads por landing con conteo
 * total/convertidos. Dominio puro: lee por `InfluencerRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';

import type { InfluencerRepository } from '../influencer-repository';
import { legacyHttpError } from './legacy-response';

export const ListReferralsInputSchema = z.object({
  mentorUid: z.string().nullish(),
});
export type ListReferralsInput = z.infer<typeof ListReferralsInputSchema>;

export interface ReferralEntry {
  readonly uid: string;
  readonly name: unknown;
  readonly email: unknown;
  readonly photoURL: unknown;
  readonly totalLeads: number;
  readonly convertedLeads: number;
  readonly assignedLandings: number;
}

export async function listReferrals(
  repo: InfluencerRepository,
  rawInput: unknown,
): Promise<Result<{ influencers: ReferralEntry[] }, DomainError>> {
  const parsed = ListReferralsInputSchema.safeParse(rawInput);
  const mentorUid = parsed.success ? (parsed.data.mentorUid ?? '') : '';
  if (!mentorUid) {
    return err(legacyHttpError(400, { error: 'mentorUid is required' }));
  }

  const referidos = await repo.listReferidos(mentorUid);
  if (referidos.length === 0) {
    return ok({ influencers: [] });
  }
  const influencerIds = referidos.map((r) => r.id);

  const pages = await repo.listSalesPagesByMentor(mentorUid);
  const landingsCount: Record<string, number> = {};
  const relevantLandingIds: string[] = [];
  for (const page of pages) {
    if (typeof page.referidoId === 'string' && influencerIds.includes(page.referidoId)) {
      relevantLandingIds.push(page.id);
      landingsCount[page.referidoId] = (landingsCount[page.referidoId] ?? 0) + 1;
    }
  }

  const totals: Record<string, { total: number; converted: number }> = {};
  const leads = await repo.listLeadsByLandingIds(relevantLandingIds);
  for (const lead of leads) {
    if (typeof lead.referidoId !== 'string') continue;
    const entry = totals[lead.referidoId] ?? { total: 0, converted: 0 };
    entry.total += 1;
    if (lead.status === 'converted') entry.converted += 1;
    totals[lead.referidoId] = entry;
  }

  return ok({
    influencers: referidos.map((ref) => ({
      uid: ref.id,
      name: (ref.data.displayName as unknown) || 'Usuario sin nombre',
      email: (ref.data.email as unknown) || 'Sin email',
      photoURL: (ref.data.photoURL as unknown) || null,
      totalLeads: totals[ref.id]?.total ?? 0,
      convertedLeads: totals[ref.id]?.converted ?? 0,
      assignedLandings: landingsCount[ref.id] ?? 0,
    })),
  });
}
