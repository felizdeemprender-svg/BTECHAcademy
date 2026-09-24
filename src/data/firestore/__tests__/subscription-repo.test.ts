/**
 * F0.1 (TDD rojo) — Repo de suscripciones con gateway falso en memoria.
 * Sin Firebase real. Aserta paths dot-notation exactos (`subscription.status`, …),
 * colecciones idénticas al legacy (`users`, `subscriptionPlans`, `salesPages`,
 * subcolección `invoices` de `users`) y filtros `mentorId ==` + `status ==`.
 */
import { describe, expect, it } from 'vitest';

import type {
  BatchUpdateOp,
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '../gateway';
import { FirestoreSubscriptionRepository } from '../subscription-repo';

type Store = Record<string, Record<string, Record<string, unknown>>>;

function snap(id: string, raw: Record<string, unknown> | undefined): DocSnapshotLike | null {
  if (raw === undefined) return null;
  return { exists: true, id, data: () => raw };
}

/** Falso con `queryByTwoFields` + `batchWrite` (gateway real nuevo). */
class FullFakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly batchCalls: BatchUpdateOp[][] = [];
  readonly twoFieldCalls: { collectionPath: string; f1: string; v1: unknown; f2: string; v2: unknown }[] = [];
  readonly subCreates: { parent: string; parentId: string; sub: string; id: string; data: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  async getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null> {
    return snap(id, this.store[collectionPath]?.[id]);
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
  ): Promise<QuerySnapshotLike> {
    this.twoFieldCalls.push({ collectionPath, f1: field1, v1: value1, f2: field2, v2: value2 });
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field1] === value1 && raw[field2] === value2)
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async batchWrite(ops: BatchUpdateOp[]): Promise<void> {
    this.batchCalls.push(ops);
    for (const op of ops) {
      const current = this.store[op.collectionPath]?.[op.id] ?? {};
      this.store[op.collectionPath][op.id] = { ...current, ...op.patch };
    }
  }

  async createDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>): Promise<void> {
    this.updates.push({ collectionPath, id, patch });
    const current = this.store[collectionPath]?.[id] ?? {};
    this.store[collectionPath][id] = { ...current, ...patch };
  }

  async deleteDoc(): Promise<void> {
    throw new Error('no usado');
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
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
    this.subCreates.push({ parent: parentCollection, parentId, sub: subCollection, id, data });
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }
}

/** Falso legacy SIN opcionales: ejerce el fallback (updateDoc secuenciales). */
class MinimalFakeGateway extends FullFakeGateway {
  override queryByTwoFields = undefined as never;
  override batchWrite = undefined as never;
}

function seed(): Store {
  return {
    subscriptionPlans: {
      'plan-pro': {
        name: 'Pro',
        trialDays: 14,
        trialReminderDays: 5,
        gracePeriodDays: 7,
        billingCycleMonths: 1,
        limits: { maxCourses: 10 },
        permissions: ['publish'],
        invitationsPerCourse: 5,
        aiQuotas: { totalCredits: 100 },
        hasPremiumAI: true,
      },
    },
    users: {
      tutor1: {
        email: 'tutor@fastoria.com',
        displayName: 'Tutora',
        subscription: { status: 'active', planId: 'plan-pro', planName: 'Pro' },
      },
    },
    salesPages: {
      p1: { mentorId: 'tutor1', status: 'active' },
      p2: { mentorId: 'tutor1', status: 'active' },
      p3: { mentorId: 'tutor1', status: 'draft' },
      p4: { mentorId: 'otro', status: 'active' },
    },
  };
}

describe('FirestoreSubscriptionRepository', () => {
  it('getPlan lee `subscriptionPlans` doc(planId) con passthrough de campos', async () => {
    const repo = new FirestoreSubscriptionRepository(new FullFakeGateway(seed()));
    const plan = await repo.getPlan('plan-pro');
    expect(plan?.id).toBe('plan-pro');
    expect(plan?.name).toBe('Pro');
    expect(plan?.trialDays).toBe(14);
    expect(plan?.limits).toEqual({ maxCourses: 10 });
    expect(plan?.hasPremiumAI).toBe(true);
  });

  it('getPlan inexistente → null', async () => {
    const repo = new FirestoreSubscriptionRepository(new FullFakeGateway(seed()));
    expect(await repo.getPlan('no-existe')).toBeNull();
  });

  it('getUserSubscription lee `users` doc(uid) con email/displayName/subscription', async () => {
    const repo = new FirestoreSubscriptionRepository(new FullFakeGateway(seed()));
    const tutor = await repo.getUserSubscription('tutor1');
    expect(tutor?.uid).toBe('tutor1');
    expect(tutor?.email).toBe('tutor@fastoria.com');
    expect(tutor?.displayName).toBe('Tutora');
    expect(tutor?.subscription).toMatchObject({ status: 'active', planId: 'plan-pro' });
  });

  it('getUserSubscription inexistente → null', async () => {
    const repo = new FirestoreSubscriptionRepository(new FullFakeGateway(seed()));
    expect(await repo.getUserSubscription('fantasma')).toBeNull();
  });

  it('updateSubscriptionFields escribe en `users` con dot-notation exacta', async () => {
    const gateway = new FullFakeGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    await repo.updateSubscriptionFields('tutor1', {
      'subscription.status': 'past_due',
      'subscription.gracePeriodEndsAt': new Date('2026-09-20'),
    });
    expect(gateway.updates).toHaveLength(1);
    expect(gateway.updates[0]?.collectionPath).toBe('users');
    expect(gateway.updates[0]?.id).toBe('tutor1');
    expect(Object.keys(gateway.updates[0]?.patch ?? {}).sort()).toEqual(
      ['subscription.gracePeriodEndsAt', 'subscription.status'].sort(),
    );
  });

  it('suspendPages usa filtro mentorId== + status==active y batch con shape legacy', async () => {
    const gateway = new FullFakeGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const count = await repo.suspendPages('tutor1');
    expect(count).toBe(2);
    expect(gateway.twoFieldCalls).toEqual([
      { collectionPath: 'salesPages', f1: 'mentorId', v1: 'tutor1', f2: 'status', v2: 'active' },
    ]);
    expect(gateway.batchCalls).toHaveLength(1);
    expect(gateway.batchCalls[0]).toEqual([
      { type: 'update', collectionPath: 'salesPages', id: 'p1', patch: { status: 'suspended_by_system' } },
      { type: 'update', collectionPath: 'salesPages', id: 'p2', patch: { status: 'suspended_by_system' } },
    ]);
    expect(gateway.updates).toHaveLength(0);
  });

  it('suspendPages sin batch en el gateway → N updateDoc secuenciales con mismo patch', async () => {
    const gateway = new MinimalFakeGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const count = await repo.suspendPages('tutor1');
    expect(count).toBe(2);
    expect(gateway.batchCalls).toHaveLength(0);
    expect(gateway.updates.map((u) => [u.collectionPath, u.id, u.patch])).toEqual([
      ['salesPages', 'p1', { status: 'suspended_by_system' }],
      ['salesPages', 'p2', { status: 'suspended_by_system' }],
    ]);
  });

  it('reactivatePages usa filtro status==suspended_by_system y revierte a active', async () => {
    const store = seed();
    store.salesPages['p1'] = { mentorId: 'tutor1', status: 'suspended_by_system' };
    const gateway = new FullFakeGateway(store);
    const repo = new FirestoreSubscriptionRepository(gateway);
    const count = await repo.reactivatePages('tutor1');
    expect(count).toBe(1);
    expect(gateway.twoFieldCalls[0]).toMatchObject({
      collectionPath: 'salesPages',
      f1: 'mentorId',
      v1: 'tutor1',
      f2: 'status',
      v2: 'suspended_by_system',
    });
    expect(gateway.batchCalls[0]).toEqual([
      { type: 'update', collectionPath: 'salesPages', id: 'p1', patch: { status: 'active' } },
    ]);
  });

  it('writeInvoice crea en subcolección `invoices` de `users` con cycleId', async () => {
    const gateway = new FullFakeGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const data = { status: 'paid', totalCharged: 100 };
    await repo.writeInvoice('tutor1', '2026-09-01', data);
    expect(gateway.subCreates).toEqual([
      { parent: 'users', parentId: 'tutor1', sub: 'invoices', id: '2026-09-01', data },
    ]);
  });
});
