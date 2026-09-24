/**
 * Capa de datos — Repositorio de lectura pública de tutores (F1.3).
 * Mismas colecciones/filtros que los routes legacy:
 * `users` (username== limit 1, doc directo, isPublic== + status in +
 * limit 8) y `landingStyles` (doc directo). Documentos CRUDOS.
 */
import type { LandingStyleSnapshot, TutorRepository, TutorSnapshot } from '@/domain/identity/tutor-repository';

import type { FirestoreGateway, QuerySnapshotLike } from './gateway';

const USERS = 'users';
const LANDING_STYLES = 'landingStyles';
const FEATURED_LIMIT = 8;
const FEATURED_STATUSES = ['active', 'ACTIVE'];

function toSnapshots(snap: QuerySnapshotLike): TutorSnapshot[] {
  return snap.docs.map((d) => ({ id: d.id, data: (d.data() ?? {}) as Record<string, unknown> }));
}

export class FirestoreTutorRepository implements TutorRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findTutorByUsername(username: string): Promise<TutorSnapshot | null> {
    const snap = await this.gateway.queryByField(USERS, 'username', username, 1);
    const first = snap.docs[0];
    if (!first) return null;
    return { id: first.id, data: (first.data() ?? {}) as Record<string, unknown> };
  }

  async findTutorById(id: string): Promise<TutorSnapshot | null> {
    const snap = await this.gateway.getDoc(USERS, id);
    if (!snap) return null;
    return { id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> };
  }

  async listFeaturedTutors(limit: number = FEATURED_LIMIT): Promise<TutorSnapshot[]> {
    if (this.gateway.queryByFilters) {
      const snap = await this.gateway.queryByFilters(
        USERS,
        [
          { field: 'subscription.isPublic', op: '==', value: true },
          { field: 'subscription.status', op: 'in', value: FEATURED_STATUSES },
        ],
        limit,
      );
      return toSnapshots(snap);
    }
    // Fallback: base isPublic== + filtro en memoria + limit (mismo resultado).
    const snap = await this.gateway.queryByField(USERS, 'subscription.isPublic', true);
    return toSnapshots(snap)
      .filter((t) => FEATURED_STATUSES.includes((t.data.subscription as { status?: unknown } | undefined)?.status as string))
      .slice(0, limit);
  }

  async findLandingStyleById(styleId: string): Promise<LandingStyleSnapshot | null> {
    const snap = await this.gateway.getDoc(LANDING_STYLES, styleId);
    if (!snap) return null;
    return { id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> };
  }
}
