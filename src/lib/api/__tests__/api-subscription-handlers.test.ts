/**
 * F0.1 (TDD rojo) — Handlers de suscripciones con gateway falso.
 * Auth y gateway inyectados (los route.ts solo cablearán en F0.3/F1.1).
 * Deps de puertos inyectables para no enviar emails reales en tests.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import type { SubscriptionNotifier } from '@/domain/identity/subscription-ports';
import {
  handleActivateTrial,
  handleBillingEvent,
  handleReactivateTutor,
  handleSuspendTutor,
  handleTrialReminder,
} from '../subscription-handlers';

const NOW = new Date('2026-09-14T12:00:00Z');

function seedStore(): Record<string, Record<string, RawDoc>> {
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
        subscription: {
          status: 'trialing',
          planId: 'plan-pro',
          planName: 'Pro',
          trialEndsAt: new Date('2026-09-17T12:00:00Z'),
        },
      },
    },
    salesPages: {
      p1: { mentorId: 'tutor1', status: 'active' },
      p2: { mentorId: 'tutor1', status: 'active' },
    },
  };
}

class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly batchOps: { collectionPath: string; id: string; patch: Record<string, unknown> }[][] = [];
  readonly sent: unknown[] = [];

  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
  ) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field1] === value1 && raw[field2] === value2)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }

  async batchWrite(ops: { type: 'update'; collectionPath: string; id: string; patch: Record<string, unknown> }[]) {
    this.batchOps.push(ops);
    for (const op of ops) {
      const current = this.store[op.collectionPath]?.[op.id] ?? {};
      this.store[op.collectionPath][op.id] = { ...current, ...op.patch };
    }
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>) {
    this.updates.push({ collectionPath, id, patch });
    const current = this.store[collectionPath]?.[id] ?? {};
    this.store[collectionPath][id] = { ...current, ...patch };
  }

  async createDoc(): Promise<void> {
    throw new Error('no usado');
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

  async createSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
}

function fakeNotifier(sent: unknown[]): SubscriptionNotifier {
  return {
    sendTrialEnding: async (n: unknown) => {
      sent.push(n);
    },
    sendSubscriptionActivated: async (n: unknown) => {
      sent.push(n);
    },
    sendPaymentFailed: async (n: unknown) => {
      sent.push(n);
    },
    sendAccountSuspended: async (n: unknown) => {
      sent.push(n);
    },
  };
}

const admin: Caller = { uid: 'admin1', isAdmin: true };
const self: Caller = { uid: 'tutor1', isAdmin: false };
const stranger: Caller = { uid: 'otro', isAdmin: false };

describe('subscription-handlers', () => {
  it('sin caller → 401', async () => {
    const gateway = new FakeGateway(seedStore());
    const res = await handleActivateTrial(gateway, null, 'tutor1', 'plan-pro', { now: NOW });
    expect(res.status).toBe(401);
  });

  it('tercero no-admin → 403', async () => {
    const gateway = new FakeGateway(seedStore());
    const res = await handleActivateTrial(gateway, stranger, 'tutor1', 'plan-pro', { now: NOW });
    expect(res.status).toBe(403);
  });

  it('activate trial propio → 200 con trialDays (sin tocar routes)', async () => {
    const gateway = new FakeGateway(seedStore());
    const res = await handleActivateTrial(gateway, self, 'tutor1', 'plan-pro', { now: NOW });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.trialDays).toBe(14);
    expect(gateway.updates[0]?.patch['subscription.status']).toBe('trialing');
  });

  it('trial reminder → 200 y envía email fake (3 días restantes)', async () => {
    const gateway = new FakeGateway(seedStore());
    const sent: unknown[] = [];
    const res = await handleTrialReminder(gateway, self, 'tutor1', {
      now: NOW,
      notifier: fakeNotifier(sent),
    });
    expect(res.status).toBe(200);
    expect(sent).toEqual([
      { email: 'tutor@fastoria.com', name: 'Tutora', daysLeft: 3, planName: 'Pro' },
    ]);
  });

  it('billing event created → 200 y enlaza gateway', async () => {
    const gateway = new FakeGateway(seedStore());
    const res = await handleBillingEvent(gateway, admin, {
      kind: 'created',
      tutorId: 'tutor1',
      subscriptionId: 'sub_9',
      gateway: 'stripe',
    });
    expect(res.status).toBe(200);
    expect(gateway.updates[0]?.patch).toEqual({
      'subscription.gateway': 'stripe',
      'subscription.gatewaySubscriptionId': 'sub_9',
    });
  });

  it('suspender como no-admin → 403; como admin → 200 + batch a salesPages', async () => {
    const gateway = new FakeGateway(seedStore());
    const forbidden = await handleSuspendTutor(gateway, self, 'tutor1', { now: NOW });
    expect(forbidden.status).toBe(403);

    const sent: unknown[] = [];
    const ok = await handleSuspendTutor(gateway, admin, 'tutor1', {
      now: NOW,
      notifier: fakeNotifier(sent),
    });
    expect(ok.status).toBe(200);
    expect(gateway.updates[0]?.patch['subscription.status']).toBe('suspended');
    expect(gateway.batchOps[0]).toEqual([
      { type: 'update', collectionPath: 'salesPages', id: 'p1', patch: { status: 'suspended_by_system' } },
      { type: 'update', collectionPath: 'salesPages', id: 'p2', patch: { status: 'suspended_by_system' } },
    ]);
    expect(sent).toHaveLength(1);
  });

  it('reactivar propio → 200 y restaura salesPages', async () => {
    const store = seedStore();
    store.salesPages['p1'] = { mentorId: 'tutor1', status: 'suspended_by_system' };
    const gateway = new FakeGateway(store);
    const res = await handleReactivateTutor(gateway, self, 'tutor1');
    expect(res.status).toBe(200);
    expect(gateway.updates[0]?.patch['subscription.status']).toBe('active');
    expect(gateway.batchOps[0]).toEqual([
      { type: 'update', collectionPath: 'salesPages', id: 'p1', patch: { status: 'active' } },
    ]);
  });
});
