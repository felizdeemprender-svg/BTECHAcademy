/**
 * Capa de datos — Repositorio de influencers/referidos (F1.3).
 * Mismas colecciones/escrituras que los routes legacy:
 * `users` (doc, email==), `roles_mentor` (doc), subcolección
 * `mentorInfluencers/{m}/referidos` (get, set con merge + serverTimestamp,
 * lista), `users` update con arrayUnion, `salesPages` (mentorId==),
 * `leads` (landingId in, batches de 10).
 */
import type {
  InfluencerRepository,
  InfluencerUserSnapshot,
  NewReferidoDoc,
  ReferidoLeadSnapshot,
  ReferidoPageSnapshot,
  ReferidoSnapshot,
} from '@/domain/commerce/influencer-repository';

import type { FirestoreGateway, QuerySnapshotLike } from './gateway';

const USERS = 'users';
const ROLES_MENTOR = 'roles_mentor';
const MENTOR_INFLUENCERS = 'mentorInfluencers';
const REFERIDOS = 'referidos';
const SALES_PAGES = 'salesPages';
const LEADS = 'leads';
const LEAD_BATCH = 10;

function userSnap(id: string, raw: Record<string, unknown> | undefined): InfluencerUserSnapshot | null {
  if (!raw) return null;
  return { id, data: raw };
}

function toReferidos(snap: QuerySnapshotLike): ReferidoSnapshot[] {
  return snap.docs.map((d) => ({ id: d.id, data: (d.data() ?? {}) as Record<string, unknown> }));
}

export class FirestoreInfluencerRepository implements InfluencerRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findMentorById(uid: string): Promise<InfluencerUserSnapshot | null> {
    const snap = await this.gateway.getDoc(USERS, uid);
    if (!snap) return null;
    return userSnap(snap.id, snap.data() as Record<string, unknown> | undefined);
  }

  async hasMentorRoleDocument(uid: string): Promise<boolean> {
    const snap = await this.gateway.getDoc(ROLES_MENTOR, uid);
    return snap !== null;
  }

  async findUserByEmail(email: string): Promise<InfluencerUserSnapshot | null> {
    const snap = await this.gateway.queryByField(USERS, 'email', email, 1);
    const first = snap.docs[0];
    if (!first) return null;
    return userSnap(first.id, first.data() as Record<string, unknown> | undefined);
  }

  async findAssociation(mentorUid: string, targetUid: string): Promise<ReferidoSnapshot | null> {
    const snap = await this.gateway.getDoc(`${MENTOR_INFLUENCERS}/${mentorUid}/${REFERIDOS}`, targetUid);
    if (!snap) return null;
    return { id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> };
  }

  async saveAssociation(mentorUid: string, targetUid: string, doc: NewReferidoDoc): Promise<void> {
    const data: Record<string, unknown> = {
      uid: doc.uid,
      displayName: doc.displayName,
      email: doc.email,
      photoURL: doc.photoURL,
      addedAt: this.gateway.serverTimestamp(),
      addedByMentorId: doc.addedByMentorId,
    };
    if (this.gateway.mergeSubDoc) {
      await this.gateway.mergeSubDoc(MENTOR_INFLUENCERS, mentorUid, REFERIDOS, targetUid, data);
      return;
    }
    // Fallback: set sin merge (mismo efecto sobre doc nuevo).
    await this.gateway.createSubDoc(MENTOR_INFLUENCERS, mentorUid, REFERIDOS, targetUid, data);
  }

  async addReferidoRole(targetUid: string, mentorUid: string): Promise<void> {
    await this.gateway.updateDoc(USERS, targetUid, {
      roles: this.gateway.arrayUnion('referido'),
      associatedMentors: this.gateway.arrayUnion(mentorUid),
    });
  }

  async listReferidos(mentorUid: string): Promise<ReferidoSnapshot[]> {
    const snap = await this.gateway.listSubDocs(MENTOR_INFLUENCERS, mentorUid, REFERIDOS);
    return toReferidos(snap);
  }

  async listSalesPagesByMentor(mentorUid: string): Promise<ReferidoPageSnapshot[]> {
    const snap = await this.gateway.queryByField(SALES_PAGES, 'mentorId', mentorUid);
    return snap.docs.map((d) => {
      const raw = (d.data() ?? {}) as Record<string, unknown>;
      return { id: d.id, mentorId: raw.mentorId, referidoId: raw.referidoId };
    });
  }

  async listLeadsByLandingIds(landingIds: readonly string[]): Promise<ReferidoLeadSnapshot[]> {
    if (landingIds.length === 0) return [];
    const out: ReferidoLeadSnapshot[] = [];
    for (let i = 0; i < landingIds.length; i += LEAD_BATCH) {
      const batch = landingIds.slice(i, i + LEAD_BATCH);
      if (this.gateway.queryByFilters) {
        const snap = await this.gateway.queryByFilters(LEADS, [{ field: 'landingId', op: 'in', value: batch }]);
        for (const d of snap.docs) {
          const raw = (d.data() ?? {}) as Record<string, unknown>;
          out.push({ referidoId: raw.referidoId, status: raw.status });
        }
      } else {
        // Fallback: un queryByField por landing (mismo conjunto resultado).
        for (const landingId of batch) {
          const snap = await this.gateway.queryByField(LEADS, 'landingId', landingId);
          for (const d of snap.docs) {
            const raw = (d.data() ?? {}) as Record<string, unknown>;
            out.push({ referidoId: raw.referidoId, status: raw.status });
          }
        }
      }
    }
    return out;
  }
}
