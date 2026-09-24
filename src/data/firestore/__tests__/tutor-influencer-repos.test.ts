/**
 * F1.3 (TDD rojo) — Repos `tutor-repo` + `influencer-repo` con gateway falso.
 * Aserta colecciones/paths/filtros EXACTOS del legacy:
 * - tutors/[username]/status: `users` username== (limit 1), `courses`
 *   mentorId== + isActive== (filtro memoria: status published/approved +
 *   publicListing!==false), `landingStyles` doc directo.
 * - tutors/featured: `users` subscription.isPublic==true +
 *   subscription.status in [active,ACTIVE] + limit 8.
 * - tutors/by-id: `users` doc directo.
 * - influencers/promote: `users` doc, `roles_mentor` doc, `users` email==
 *   (limit 1), `mentorInfluencers/{m}/referidos/{t}` get + set merge,
 *   `users` update arrayUnion(roles/associatedMentors) + serverTimestamp.
 * - influencers/list: `mentorInfluencers/{m}/referidos` lista,
 *   `salesPages` mentorId==, `leads` landingId in (batches de 10).
 * Cubre gateway completo (opcionales) y fallback (primitivas + memoria).
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QueryFilterClause,
  QuerySnapshotLike,
} from '../gateway';
import type { RawDoc } from '../mappers';
import { FirestoreTutorRepository } from '../tutor-repo';
import { FirestoreInfluencerRepository } from '../influencer-repo';

function snap(id: string, raw: RawDoc): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

function getField(raw: RawDoc, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as RawDoc)[part];
  }, raw);
}

function matchesFilters(raw: RawDoc, filters: readonly QueryFilterClause[]): boolean {
  return filters.every((f) => {
    const actual = getField(raw, f.field);
    switch (f.op) {
      case '==':
        return actual === f.value;
      case 'in':
        return Array.isArray(f.value) && (f.value as unknown[]).includes(actual);
      default:
        return false;
    }
  });
}

interface Call {
  readonly kind: string;
  readonly path: string;
  readonly detail?: string;
}

type Store = Record<string, Record<string, RawDoc>>;

/** Gateway completo: opcionales queryByTwoFields/queryByFilters/mergeSubDoc. */
class FullFakeGateway implements FirestoreGateway {
  readonly calls: Call[] = [];
  readonly subWrites: { path: string; id: string; data: Record<string, unknown>; merge: boolean }[] = [];
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  private docsOf(collectionPath: string): [string, RawDoc][] {
    return Object.entries(this.store[collectionPath] ?? {});
  }

  async getDoc(collectionPath: string, id: string) {
    // Soporta path de subcolección `mentorInfluencers/{m}/referidos`.
    if (collectionPath.includes('/')) {
      this.calls.push({ kind: 'getDoc', path: `${collectionPath}/${id}` });
      const raw = this.store[collectionPath]?.[id];
      if (raw === undefined) return null;
      return snap(id, raw);
    }
    this.calls.push({ kind: 'getDoc', path: collectionPath, detail: id });
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
  }

  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    this.calls.push({ kind: 'listDocs', path: collectionPath });
    return { docs: this.docsOf(collectionPath).map(([id, raw]) => snap(id, raw)) };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    this.calls.push({ kind: 'queryByField', path: collectionPath, detail: `${field}==${String(value)}` });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field) === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ) {
    this.calls.push({ kind: 'queryByTwoFields', path: collectionPath, detail: `${field1}+${field2}` });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field1) === value1 && getField(raw, field2) === value2)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByFilters(collectionPath: string, filters: readonly QueryFilterClause[], limit?: number) {
    this.calls.push({
      kind: 'queryByFilters',
      path: collectionPath,
      detail: filters.map((f) => `${f.field}${f.op}${JSON.stringify(f.value)}`).join(','),
    });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => matchesFilters(raw, filters))
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async createDoc(): Promise<void> {}

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>): Promise<void> {
    this.calls.push({ kind: 'updateDoc', path: collectionPath, detail: id });
    this.updates.push({ collectionPath, id, patch });
  }

  async deleteDoc(): Promise<void> {}

  serverTimestamp(): unknown {
    return { __ts: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __union: elements };
  }

  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const path = `${parentCollection}/${parentId}/${subCollection}`;
    this.calls.push({ kind: 'listSubDocs', path });
    return { docs: this.docsOf(path).map(([id, raw]) => snap(id, raw)) };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.calls.push({ kind: 'createSubDoc', path: `${parentCollection}/${parentId}/${subCollection}/${id}` });
    this.subWrites.push({ path: `${parentCollection}/${parentId}/${subCollection}`, id, data, merge: false });
  }

  async mergeSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.calls.push({ kind: 'mergeSubDoc', path: `${parentCollection}/${parentId}/${subCollection}/${id}` });
    this.subWrites.push({ path: `${parentCollection}/${parentId}/${subCollection}`, id, data, merge: true });
  }

  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
}

/** Gateway mínimo: SIN opcionales (fuerza los fallbacks del repo). */
class MinimalFakeGateway extends FullFakeGateway {
  override queryByTwoFields = undefined as any;
  override queryByFilters = undefined as any;
  override mergeSubDoc = undefined as any;
}

function tutorStore(): Store {
  return {
    users: {
      'tutor-1': {
        username: 'ana',
        displayName: 'Ana',
        email: 'ana@x.com',
        roles: ['mentor'],
        subscription: { status: 'active', isPublic: true },
      },
      'tutor-2': {
        username: 'leo',
        displayName: 'Leo',
        email: 'leo@x.com',
        roles: ['mentor'],
        subscription: { status: 'ACTIVE', isPublic: true },
      },
      'tutor-3': {
        username: 'priv',
        displayName: 'Priv',
        email: 'priv@x.com',
        roles: ['mentor'],
        subscription: { status: 'inactive', isPublic: false },
      },
    },
    landingStyles: {
      classic: { name: 'Classic' },
    },
  };
}

describe('FirestoreTutorRepository', () => {
  it('findTutorByUsername lee `users` username== limit 1', async () => {
    const gw = new FullFakeGateway(tutorStore());
    const repo = new FirestoreTutorRepository(gw);
    const found = await repo.findTutorByUsername('ana');
    expect(found?.id).toBe('tutor-1');
    expect(gw.calls.some((c) => c.kind === 'queryByField' && c.path === 'users')).toBe(true);
    expect(await repo.findTutorByUsername('nadie')).toBeNull();
  });

  it('findTutorById lee `users` doc directo', async () => {
    const gw = new FullFakeGateway(tutorStore());
    const repo = new FirestoreTutorRepository(gw);
    expect((await repo.findTutorById('tutor-2'))?.id).toBe('tutor-2');
    expect(await repo.findTutorById('nope')).toBeNull();
  });

  it('listFeaturedTutors usa isPublic==true + status in [active,ACTIVE] + limit 8', async () => {
    const gw = new FullFakeGateway(tutorStore());
    const repo = new FirestoreTutorRepository(gw);
    const featured = await repo.listFeaturedTutors();
    expect(featured.map((t) => t.id).sort()).toEqual(['tutor-1', 'tutor-2']);
    const call = gw.calls.find((c) => c.kind === 'queryByFilters' && c.path === 'users');
    expect(call?.detail).toContain('subscription.isPublic');
    expect(call?.detail).toContain('subscription.status');
    expect(call?.detail).toContain('active');
  });

  it('listFeaturedTutors fallback: queryByField + filtro en memoria idéntico', async () => {
    const gw = new MinimalFakeGateway(tutorStore());
    const repo = new FirestoreTutorRepository(gw);
    const featured = await repo.listFeaturedTutors();
    expect(featured.map((t) => t.id).sort()).toEqual(['tutor-1', 'tutor-2']);
    expect(gw.calls.some((c) => c.kind === 'queryByField' && c.path === 'users')).toBe(true);
  });

  it('findLandingStyleById lee `landingStyles` doc directo', async () => {
    const gw = new FullFakeGateway(tutorStore());
    const repo = new FirestoreTutorRepository(gw);
    expect((await repo.findLandingStyleById('classic'))?.id).toBe('classic');
    expect(await repo.findLandingStyleById('otro')).toBeNull();
  });
});

function influencerStore(): Store {
  return {
    users: {
      'mentor-1': { displayName: 'Mentor', email: 'mentor@x.com', roles: ['mentor'] },
      'user-9': { displayName: 'Ref', email: 'ref@x.com', roles: ['student'] },
    },
    roles_mentor: {
      'mentor-1': { granted: true },
    },
    'mentorInfluencers/mentor-1/referidos': {
      'user-9': { uid: 'user-9', displayName: 'Ref', email: 'ref@x.com', photoURL: null },
    },
    salesPages: {
      'page-1': { mentorId: 'mentor-1', referidoId: 'user-9', slug: 'curso' },
      'page-2': { mentorId: 'mentor-1', referidoId: null, slug: 'otro' },
      'page-3': { mentorId: 'otro-mentor', referidoId: 'user-9', slug: 'x' },
    },
    leads: {
      'lead-1': { landingId: 'page-1', referidoId: 'user-9', status: 'new' },
      'lead-2': { landingId: 'page-1', referidoId: 'user-9', status: 'converted' },
    },
  };
}

describe('FirestoreInfluencerRepository', () => {
  it('promote: lee mentor (`users` doc) + `roles_mentor` doc + `users` email==', async () => {
    const gw = new FullFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    expect((await repo.findMentorById('mentor-1'))?.id).toBe('mentor-1');
    expect(await repo.findMentorById('nadie')).toBeNull();
    expect(await repo.hasMentorRoleDocument('mentor-1')).toBe(true);
    expect(await repo.hasMentorRoleDocument('user-9')).toBe(false);
    expect((await repo.findUserByEmail('ref@x.com'))?.id).toBe('user-9');
    expect(await repo.findUserByEmail('nadie@x.com')).toBeNull();
  });

  it('findAssociation lee `mentorInfluencers/{m}/referidos/{t}`', async () => {
    const gw = new FullFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    expect((await repo.findAssociation('mentor-1', 'user-9'))?.id).toBe('user-9');
    expect(await repo.findAssociation('mentor-1', 'otro')).toBeNull();
  });

  it('saveAssociation escribe con merge + serverTimestamp + addedByMentorId', async () => {
    const gw = new FullFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    await repo.saveAssociation('mentor-1', 'user-9', {
      uid: 'user-9',
      displayName: 'Ref',
      email: 'ref@x.com',
      photoURL: null,
      addedByMentorId: 'mentor-1',
    });
    const w = gw.subWrites.find((x) => x.path === 'mentorInfluencers/mentor-1/referidos' && x.id === 'user-9');
    expect(w?.merge).toBe(true);
    expect(w?.data.addedByMentorId).toBe('mentor-1');
    expect(w?.data.addedAt).toEqual({ __ts: true });
  });

  it('saveAssociation fallback sin mergeSubDoc usa createSubDoc', async () => {
    const gw = new MinimalFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    await repo.saveAssociation('mentor-1', 'user-9', {
      uid: 'user-9',
      displayName: 'Ref',
      email: 'ref@x.com',
      photoURL: null,
      addedByMentorId: 'mentor-1',
    });
    expect(gw.calls.some((c) => c.kind === 'createSubDoc')).toBe(true);
  });

  it('addReferidoRole hace update con arrayUnion(roles/associatedMentors)', async () => {
    const gw = new FullFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    await repo.addReferidoRole('user-9', 'mentor-1');
    const u = gw.updates.find((x) => x.collectionPath === 'users' && x.id === 'user-9');
    expect(u?.patch.roles).toEqual({ __union: ['referido'] });
    expect(u?.patch.associatedMentors).toEqual({ __union: ['mentor-1'] });
  });

  it('list: referidos + salesPages mentorId== + leads en batches de 10', async () => {
    const store = influencerStore();
    const landingIds: Record<string, RawDoc> = {};
    for (let i = 0; i < 12; i++) {
      landingIds[`page-x${i}`] = { mentorId: 'mentor-1', referidoId: 'user-9', slug: `s${i}` };
    }
    store.salesPages = { ...store.salesPages, ...landingIds };
    const gw = new FullFakeGateway(store);
    const repo = new FirestoreInfluencerRepository(gw);
    const referidos = await repo.listReferidos('mentor-1');
    expect(referidos.map((r) => r.id)).toEqual(['user-9']);
    const pages = await repo.listSalesPagesByMentor('mentor-1');
    expect(pages.length).toBe(14);
    const ids = pages.map((p) => p.id);
    const leads = await repo.listLeadsByLandingIds(ids);
    expect(leads.length).toBe(2);
    const inCalls = gw.calls.filter((c) => c.kind === 'queryByFilters' && c.path === 'leads');
    expect(inCalls.length).toBe(2);
  });

  it('listLeadsByLandingIds fallback: un queryByField por landing', async () => {
    const gw = new MinimalFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    const leads = await repo.listLeadsByLandingIds(['page-1', 'page-2']);
    expect(leads.length).toBe(2);
    expect(gw.calls.filter((c) => c.kind === 'queryByField' && c.path === 'leads').length).toBe(2);
  });

  it('listLeadsByLandingIds vacío no toca Firestore', async () => {
    const gw = new FullFakeGateway(influencerStore());
    const repo = new FirestoreInfluencerRepository(gw);
    expect(await repo.listLeadsByLandingIds([])).toEqual([]);
    expect(gw.calls.some((c) => c.path === 'leads')).toBe(false);
  });
});
