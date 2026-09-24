/**
 * Comercio — Caso de uso: promover influencer/referido (F1.3).
 * Lógica 1:1 con `POST api/influencers/promote` legacy:
 * 400 sin mentorUid/targetEmail, 404 mentor inexistente, 403 si no es
 * mentor (roles o doc `roles_mentor`), búsqueda por email normalizado
 * (lower+trim), 404 sin usuario, chequeo de asociación previa, modo
 * `searchOnly` sin escrituras, y promote con set merge + serverTimestamp
 * + arrayUnion (`roles` += referido, `associatedMentors` += mentorUid).
 * Dominio puro: escribe por `InfluencerRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';

import type { InfluencerRepository } from '../influencer-repository';
import { legacyHttpError } from './legacy-response';

export const PromoteInfluencerInputSchema = z.object({
  mentorUid: z.string().nullish(),
  targetEmail: z.string().nullish(),
  searchOnly: z.boolean().optional(),
});
export type PromoteInfluencerInput = z.infer<typeof PromoteInfluencerInputSchema>;

export interface PromotedUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: unknown;
  readonly photoURL: string | null;
}

export interface PromoteInfluencerResult {
  readonly success: true;
  readonly alreadyAssociated: boolean;
  readonly user: PromotedUser;
}

function asDisplayName(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : (value ?? null) as string | null;
}

function toUser(uid: string, data: Record<string, unknown>): PromotedUser {
  return {
    uid,
    displayName: (data.displayName as string | null | undefined) ?? null,
    email: data.email,
    photoURL: (data.photoURL as string | null | undefined) ?? null,
  };
}

export async function promoteInfluencer(
  repo: InfluencerRepository,
  rawInput: unknown,
): Promise<Result<PromoteInfluencerResult, DomainError>> {
  const parsed = PromoteInfluencerInputSchema.safeParse(rawInput);
  const mentorUid = parsed.success ? (parsed.data.mentorUid ?? '') : '';
  const targetEmail = parsed.success ? (parsed.data.targetEmail ?? '') : '';
  const searchOnly = parsed.success ? (parsed.data.searchOnly ?? false) : false;

  if (!mentorUid || !targetEmail) {
    return err(legacyHttpError(400, { error: 'mentorUid and targetEmail are required' }));
  }

  const mentor = await repo.findMentorById(mentorUid);
  if (!mentor) {
    return err(legacyHttpError(404, { error: 'Mentor not found' }));
  }
  const roles = Array.isArray(mentor.data.roles) ? (mentor.data.roles as unknown[]) : [];
  const hasMentorDoc = await repo.hasMentorRoleDocument(mentorUid);
  if (!roles.includes('mentor') && !hasMentorDoc) {
    return err(legacyHttpError(403, { error: 'Only mentors can promote influencers' }));
  }

  const email = targetEmail.toLowerCase().trim();
  const target = await repo.findUserByEmail(email);
  if (!target) {
    return err(legacyHttpError(404, { error: 'No user found with that email' }));
  }
  const targetUid = target.id;
  const targetData = target.data;

  const existing = await repo.findAssociation(mentorUid, targetUid);
  const alreadyAssociated = existing !== null;

  if (searchOnly) {
    return ok({ success: true, alreadyAssociated, user: toUser(targetUid, targetData) });
  }

  await repo.saveAssociation(mentorUid, targetUid, {
    uid: targetUid,
    displayName: asDisplayName(targetData.displayName),
    email: targetData.email,
    photoURL: asDisplayName(targetData.photoURL),
    addedByMentorId: mentorUid,
  });
  await repo.addReferidoRole(targetUid, mentorUid);

  return ok({ success: true, alreadyAssociated: false, user: toUser(targetUid, targetData) });
}
