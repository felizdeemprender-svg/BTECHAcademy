/**
 * F1.3 (TDD rojo) — Handlers de tutors: envelopes legacy exactos
 * (mismos status/bodies, rutas públicas sin auth).
 * - status: 200 {available,tutor} / 404 not_found / 403
 *   subscription_inactive|profile_private / 412 rama local / 500.
 * - payment-options: 400 mentorId requerido / 200 {methods} /
 *   500 {error:'Error interno',methods:[]}.
 * - featured: 200 {subscriptions} / 500.
 * - by-id: 200 subset público / 404 / 500.
 */
import { describe, expect, it } from 'vitest';

import type { DocSnapshotLike, FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import {
  handleGetPaymentOptions,
  handleGetTutorById,
  handleGetTutorStatus,
  handleListFeaturedTutors,
} from '../tutor-handlers';

type Store = Record<string, Record<string, RawDoc>>;

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
  readonly failOn: Set<string>;

  constructor(
    private readonly store: Store,
    opts?: { failOn?: string[] },
  ) {
    this.failOn = new Set(opts?.failOn ?? []);
  }

  private docsOf(collectionPath: string): [string, RawDoc][] {
    return Object.entries(this.store[collectionPath] ?? {});
  }

  private boom(path: string): void {
    if (this.failOn.has(path)) throw new Error('firestore caído');
  }

  async getDoc(collectionPath: string, id: string) {
    this.boom(collectionPath);
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
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
  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
}

function baseStore(): Store {
  return {
    users: {
      'tutor-1': {
        username: 'ana',
        displayName: 'Ana',
        email: 'ana@x.com',
        photoURL: 'https://pic/ana.png',
        expertise: ['ventas'],
        location: 'AR',
        roles: ['mentor'],
        subscription: { status: 'active', plan: 'pro', isPublic: true },
        profile: {
          bio: 'Hola',
          websiteConfig: { styleId: 'classic', brandName: null },
          brands: [],
          branding: { primaryColor: '#111111', logoUrl: 'https://logo.png' },
        },
        stats: { totalStudents: 10, totalCourses: 9, avgRating: 5, totalHours: 3 },
      },
      'tutor-off': {
        username: 'off',
        displayName: 'Off',
        email: 'off@x.com',
        roles: ['mentor'],
        subscription: { status: 'past_due' },
        profile: {},
      },
    },
    courses: {
      c1: { mentorId: 'tutor-1', isActive: true, status: 'published', publicListing: true },
    },
    landingStyles: {},
    'users/tutor-1/paymentMethods': {
      m1: { name: 'MP', type: 'mercadopago', isActive: true, config: { publicKey: 'pk', accessToken: 'S' } },
    },
  };
}

describe('handleGetTutorStatus', () => {
  it('200 con envelope legacy completo', async () => {
    const res = await handleGetTutorStatus(new FakeGateway(baseStore()), 'ana');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.available).toBe(true);
    const tutor = body.tutor as Record<string, unknown>;
    expect(tutor.id).toBe('tutor-1');
    expect(tutor.displayName).toBe('Ana');
    expect((tutor.stats as { totalCourses: number }).totalCourses).toBe(1);
    expect((tutor.branding as { primaryColor: string }).primaryColor).toBe('#1E40AF');
  });

  it('404 not_found idéntico', async () => {
    const res = await handleGetTutorStatus(new FakeGateway(baseStore()), 'nadie');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Tutor not found', available: false, reason: 'not_found' });
  });

  it('403 subscription_inactive idéntico', async () => {
    const res = await handleGetTutorStatus(new FakeGateway(baseStore()), 'off');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Tutor subscription is not active',
      available: false,
      reason: 'subscription_inactive',
    });
  });

  it('rama local omite suscripción y usa stats.totalCourses', async () => {
    const res = await handleGetTutorStatus(new FakeGateway(baseStore()), 'off', false);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tutor: { stats: { totalCourses: number } } };
    expect(body.tutor.stats.totalCourses).toBe(0);
  });

  it('firestore caído → 500 en admin, 412 en local', async () => {
    const admin = await handleGetTutorStatus(new FakeGateway(baseStore(), { failOn: ['users'] }), 'ana', true);
    expect(admin.status).toBe(500);
    const local = await handleGetTutorStatus(new FakeGateway(baseStore(), { failOn: ['users'] }), 'ana', false);
    expect(local.status).toBe(412);
    expect(await local.json()).toEqual({
      error: 'No se puede consultar el perfil del tutor localmente sin service-account.json',
      available: false,
      reason: 'server_error',
    });
  });
});

describe('handleGetPaymentOptions', () => {
  it('400 sin mentorId', async () => {
    const res = await handleGetPaymentOptions(new FakeGateway(baseStore()), '');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'mentorId requerido' });
  });

  it('200 con métodos sanitizados', async () => {
    const res = await handleGetPaymentOptions(new FakeGateway(baseStore()), 'tutor-1');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      methods: [{ id: 'm1', name: 'MP', type: 'mercadopago', config: { publicKey: 'pk' } }],
    });
  });

  it('500 con methods:[]', async () => {
    const res = await handleGetPaymentOptions(
      new FakeGateway(baseStore(), { failOn: ['users/tutor-1/paymentMethods'] }),
      'tutor-1',
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Error interno', methods: [] });
  });
});

describe('handleListFeaturedTutors', () => {
  it('200 con spread de subscription', async () => {
    const res = await handleListFeaturedTutors(new FakeGateway(baseStore()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      subscriptions: [{ id: 'tutor-1', tutorName: 'Ana', status: 'active', plan: 'pro', isPublic: true }],
    });
  });

  it('500 idéntico', async () => {
    const res = await handleListFeaturedTutors(new FakeGateway(baseStore(), { failOn: ['users'] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch featured subscriptions' });
  });
});

describe('handleGetTutorById', () => {
  it('200 con subset público', async () => {
    const res = await handleGetTutorById(new FakeGateway(baseStore()), 'tutor-1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.displayName).toBe('Ana');
    expect(body.username).toBe('ana');
    expect(body).not.toHaveProperty('subscription');
    expect(body).not.toHaveProperty('roles');
  });

  it('404 idéntico', async () => {
    const res = await handleGetTutorById(new FakeGateway(baseStore()), 'nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Tutor not found' });
  });

  it('500 idéntico', async () => {
    const res = await handleGetTutorById(new FakeGateway(baseStore(), { failOn: ['users'] }), 'tutor-1');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});


