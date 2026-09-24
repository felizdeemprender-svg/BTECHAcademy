/**
 * F1.3 (TDD rojo) — Handlers de influencers + discovery (v/resolve, track):
 * envelopes legacy exactos, rutas públicas sin auth.
 * - promote: 400/404/403/searchOnly/promote/500 con details.
 * - list: 400/200 enriquecido/200 vacío/500 con details.
 * - resolve: 400/404/{id}/500.
 * - track: 400 sin pageId / redirect 307 con UTMs / redirect fallback si falla.
 */
import { describe, expect, it } from 'vitest';

import type { DocSnapshotLike, FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import { handleListInfluencers, handlePromoteInfluencer } from '../influencer-handlers';
import { handleResolveSalesPage, handleTrackEvent } from '../discovery-handlers';

function snap(id: string, raw: RawDoc): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

function getField(raw: RawDoc, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as RawDoc)[part];
  }, raw);
}

class FakeGateway implements FirestoreGateway {
  readonly fail: Set<string>;
  merged = false;

  constructor(
    private readonly store: Record<string, Record<string, RawDoc>>,
    opts?: { fail?: string[] },
  ) {
    this.fail = new Set(opts?.fail ?? []);
  }

  private docsOf(collectionPath: string): [string, RawDoc][] {
    return Object.entries(this.store[collectionPath] ?? {});
  }

  private boom(path: string): void {
    if (this.fail.has(path)) throw new Error('firestore caído');
  }

  async getDoc(collectionPath: string, id: string) {
    if (collectionPath.includes('/')) {
      this.boom(collectionPath);
      const raw = this.store[collectionPath]?.[id];
      return raw === undefined ? null : snap(id, raw);
    }
    this.boom(collectionPath);
    const raw = this.store[collectionPath]?.[id];
    return raw === undefined ? null : snap(id, raw);
  }

  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    this.boom(collectionPath);
    return { docs: this.docsOf(collectionPath).map(([id, raw]) => snap(id, raw)) };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    this.boom(collectionPath);
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field) === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async createDoc(): Promise<void> {}
  async updateDoc(): Promise<void> {}
  async deleteDoc(): Promise<void> {}
  async mergeDoc(): Promise<void> {
    this.merged = true;
  }
  increment(n: number): unknown {
    return { __inc: n };
  }
  serverTimestamp(): unknown {
    return { __ts: true };
  }
  arrayUnion(...elements: unknown[]): unknown {
    return { __union: elements };
  }
  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const path = `${parentCollection}/${parentId}/${subCollection}`;
    this.boom(path);
    return { docs: this.docsOf(path).map(([id, raw]) => snap(id, raw)) };
  }
  async countSubDocs(): Promise<number> {
    return 0;
  }
  async createSubDoc(): Promise<void> {}
  async mergeSubDoc(): Promise<void> {}
  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
}

function influencerStore(): Record<string, Record<string, RawDoc>> {
  return {
    users: {
      'mentor-1': { displayName: 'Mentor', email: 'mentor@x.com', roles: ['mentor'] },
      'user-9': { displayName: 'Ref', email: 'ref@x.com', photoURL: null, roles: ['student'] },
    },
    roles_mentor: { 'mentor-1': { granted: true } },
    'mentorInfluencers/mentor-1/referidos': {},
    salesPages: {
      'page-1': { mentorId: 'mentor-1', referidoId: 'user-9', slug: 'curso' },
    },
    leads: {
      l1: { landingId: 'page-1', referidoId: 'user-9', status: 'converted' },
    },
  };
}

describe('handlePromoteInfluencer', () => {
  it('400 faltantes', async () => {
    const res = await handlePromoteInfluencer(new FakeGateway(influencerStore()), {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'mentorUid and targetEmail are required' });
  });

  it('searchOnly responde sin promover', async () => {
    const res = await handlePromoteInfluencer(new FakeGateway(influencerStore()), {
      mentorUid: 'mentor-1',
      targetEmail: 'ref@x.com',
      searchOnly: true,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.alreadyAssociated).toBe(false);
  });

  it('promote responde success + alreadyAssociated:false', async () => {
    const res = await handlePromoteInfluencer(new FakeGateway(influencerStore()), {
      mentorUid: 'mentor-1',
      targetEmail: 'ref@x.com',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ success: true, alreadyAssociated: false });
  });

  it('404 email inexistente', async () => {
    const res = await handlePromoteInfluencer(new FakeGateway(influencerStore()), {
      mentorUid: 'mentor-1',
      targetEmail: 'nadie@x.com',
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'No user found with that email' });
  });

  it('500 con details', async () => {
    const res = await handlePromoteInfluencer(new FakeGateway(influencerStore(), { fail: ['users'] }), {
      mentorUid: 'mentor-1',
      targetEmail: 'ref@x.com',
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; details: string };
    expect(body.error).toBe('Internal server error');
    expect(typeof body.details).toBe('string');
  });
});

describe('handleListInfluencers', () => {
  it('400 sin mentorUid', async () => {
    const res = await handleListInfluencers(new FakeGateway(influencerStore()), '');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'mentorUid is required' });
  });

  it('200 vacío cuando no hay referidos', async () => {
    const res = await handleListInfluencers(new FakeGateway(influencerStore()), 'mentor-1');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ influencers: [] });
  });

  it('500 con details', async () => {
    const res = await handleListInfluencers(
      new FakeGateway(influencerStore(), { fail: ['mentorInfluencers/mentor-1/referidos'] }),
      'mentor-1',
    );
    expect(res.status).toBe(500);
  });
});

function resolveStore(): Record<string, Record<string, RawDoc>> {
  return {
    users: {
      'tutor-1': { username: 'ana' },
    },
    salesPages: {
      'page-1': { mentorId: 'tutor-1', slug: 'curso' },
    },
  };
}

describe('handleResolveSalesPage', () => {
  it('200 con id', async () => {
    const res = await handleResolveSalesPage(new FakeGateway(resolveStore()), 'ana', 'curso');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'page-1' });
  });

  it('400 sin parámetros', async () => {
    const res = await handleResolveSalesPage(new FakeGateway(resolveStore()), '', '');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing parameters' });
  });

  it('404 tutor', async () => {
    const res = await handleResolveSalesPage(new FakeGateway(resolveStore()), 'nadie', 'curso');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Tutor not found' });
  });

  it('500 interno', async () => {
    const res = await handleResolveSalesPage(new FakeGateway(resolveStore(), { fail: ['users'] }), 'ana', 'curso');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('handleTrackEvent', () => {
  it('redirect con UTMs internas', async () => {
    const gw = new FakeGateway(resolveStore());
    const res = await handleTrackEvent(
      gw,
      'https://app.test/api/track?pageId=page-1&v=2&source=bio&channel=wa',
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/v/page-1');
    expect(location).toContain('v=2');
    expect(location).toContain('s=bio');
    expect(location).toContain('c=wa');
    expect(gw.merged).toBe(true);
  });

  it('400 sin pageId', async () => {
    const res = await handleTrackEvent(new FakeGateway(resolveStore()), 'https://app.test/api/track');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing pageId' });
  });

  it('si falla el tracking igual redirige al fallback', async () => {
    const res = await handleTrackEvent(
      new FakeGateway(resolveStore(), { fail: ['salesPages'] }),
      'https://app.test/api/track?pageId=page-1&v=2',
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/v/page-1?v=2');
  });
});
