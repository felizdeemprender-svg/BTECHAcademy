/**
 * Comercio — Contrato de influencers/referidos (F1.3).
 * Solo las operaciones que los routes legacy realmente hacen:
 * - `api/influencers/promote`: `users` doc (mentor), `roles_mentor` doc,
 *   `users` email== (limit 1), `mentorInfluencers/{m}/referidos/{t}` get +
 *   set con merge, `users` update con arrayUnion.
 * - `api/influencers/list`: `mentorInfluencers/{m}/referidos` lista,
 *   `salesPages` mentorId==, `leads` landingId in (batches de 10).
 * Documentos CRUDOS (tolerancia a docs viejos, igual que el legacy).
 * Dominio puro: sin firebase, sin next.
 */

export interface InfluencerUserSnapshot {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface ReferidoSnapshot {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface ReferidoPageSnapshot {
  readonly id: string;
  readonly mentorId?: unknown;
  readonly referidoId?: unknown;
}

export interface ReferidoLeadSnapshot {
  readonly referidoId?: unknown;
  readonly status?: unknown;
}

/** Campos de `mentorInfluencers/{m}/referidos/{t}` (addedAt lo pone el repo). */
export interface NewReferidoDoc {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: unknown;
  readonly photoURL: string | null;
  readonly addedByMentorId: string;
}

export interface InfluencerRepository {
  /** `users` doc(uid) del mentor. `null` si no existe. */
  findMentorById(uid: string): Promise<InfluencerUserSnapshot | null>;
  /** Existe `roles_mentor` doc(uid). */
  hasMentorRoleDocument(uid: string): Promise<boolean>;
  /** `users` con email== (limit 1). `null` si no existe. */
  findUserByEmail(email: string): Promise<InfluencerUserSnapshot | null>;
  /** `mentorInfluencers/{m}/referidos/{t}`. `null` si no existe. */
  findAssociation(mentorUid: string, targetUid: string): Promise<ReferidoSnapshot | null>;
  /** Set con merge + serverTimestamp (igual que el legacy). */
  saveAssociation(mentorUid: string, targetUid: string, doc: NewReferidoDoc): Promise<void>;
  /** `users` update: arrayUnion roles/associatedMentors (igual que el legacy). */
  addReferidoRole(targetUid: string, mentorUid: string): Promise<void>;
  /** Lista `mentorInfluencers/{m}/referidos`. */
  listReferidos(mentorUid: string): Promise<ReferidoSnapshot[]>;
  /** `salesPages` con mentorId==. */
  listSalesPagesByMentor(mentorUid: string): Promise<ReferidoPageSnapshot[]>;
  /** `leads` con landingId in (batches de 10, límite de Firestore). */
  listLeadsByLandingIds(landingIds: readonly string[]): Promise<ReferidoLeadSnapshot[]>;
}
