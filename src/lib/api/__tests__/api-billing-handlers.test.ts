/**
 * F0.3 (TDD rojo) — Handlers de billing/admin (cancel, reporte, cron,
 * planes, tutores): firma `(gateway, caller, ...args)`, auth inyectada y
 * envelopes legacy exactos (NO `toApiResponse`: los bodies históricos usan
 * mensajes propios y 201/404/400 específicos).
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import type { ExternalBillingGateway } from '@/domain/identity/subscription-ports';
import type { MonthlyCharge } from '@/domain/identity/use-cases/process-due-billing';
import {
  handleBillingCron,
  handleBillingReport,
  handleCancelSubscription,
} from '../billing-report-handler';
import {
  handleCreatePlan,
  handleDeletePlan,
  handleGetTutorSubscription,
  handleListPlans,
  handleListTutorSubscriptions,
  handlePublicPlans,
  handleUpdatePlan,
  handleUpdateTutorSubscription,
} from '../subscription-admin-handlers';

const NOW = new Date('2026-09-14T12:00:00Z');

type Store = Record<string, Record<string, RawDoc>>;

function seedStore(): Store {
  return {
    users: {
      tutor1: {
        email: 'tutor@fastoria.com',
        displayName: 'Tutora',
        username: 'tutora',
        photoURL: '',
        roles: ['mentor'],
        subscription: { status: 'active', type: 'fixed', fixedAmount: 100, gateway: 'stripe', gatewaySubscriptionId: 'sub_9', planName: 'Pro' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      tutor2: {
        email: 'b@x.com',
        displayName: 'Beto',
        roles: ['mentor'],
        subscription: { status: 'active', type: 'percentage', percentageRate: 10, planName: 'Rev' },
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
    },
    salesPages: {
      sp1: { mentorId: 'tutor2', courseId: 'c1', price: 1000, isActive: true, stats: { conversions: 2 } },
    },
    enrollments: {},
    courses: {
      c1: { mentorId: 'tutor2', isActive: true },
    },
    subscriptionPlans: {
      pro: { name: 'Pro', type: 'fixed', price: 100, createdAt: new Date('2026-01-01T00:00:00Z') },
    },
    'subscription-plans': {},
  };
}

class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly deleted: { collectionPath: string; id: string }[] = [];

  constructor(private readonly store: Store) {}

  private docsOf(collectionPath: string) {
    return Object.entries(this.store[collectionPath] ?? {}).map(([id, raw]) => ({
      exists: true as const,
      id,
      data: () => raw,
    }));
  }

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    return { docs: this.docsOf(collectionPath) };
  }

  async queryByField(collectionPath: string, field: string, value: unknown) {
    return { docs: this.docsOf(collectionPath).filter((d) => d.data()[field] === value) };
  }

  async queryByTwoFields(collectionPath: string, f1: string, v1: unknown, f2: string, v2: unknown) {
    return {
      docs: this.docsOf(collectionPath).filter((d) => d.data()[f1] === v1 && d.data()[f2] === v2),
    };
  }

  async queryArrayContains(collectionPath: string, field: string, value: unknown) {
    return {
      docs: this.docsOf(collectionPath).filter((d) => {
        const v = d.data()[field];
        return Array.isArray(v) && v.includes(value);
      }),
    };
  }

  async batchWrite(): Promise<void> {
    throw new Error('no usado');
  }

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>): Promise<void> {
    this.store[collectionPath][id] = data;
  }

  async createDocAutoId(collectionPath: string, data: Record<string, unknown>): Promise<string> {
    this.store[collectionPath]['generated-id'] = data;
    return 'generated-id';
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>) {
    this.updates.push({ collectionPath, id, patch });
    const current = this.store[collectionPath]?.[id] ?? {};
    this.store[collectionPath][id] = { ...current, ...patch };
  }

  async deleteDoc(collectionPath: string, id: string): Promise<void> {
    this.deleted.push({ collectionPath, id });
    delete this.store[collectionPath]?.[id];
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
    return undefined;
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }
}

const admin: Caller = { uid: 'admin1', isAdmin: true };
const self: Caller = { uid: 'tutor1', isAdmin: false };

function fakeBilling(calls: unknown[]): ExternalBillingGateway {
  return {
    cancelExternalSubscription: async (gateway, subscriptionId) => {
      calls.push({ gateway, subscriptionId });
    },
  };
}

function fakeCharge(): MonthlyCharge {
  return { chargeMonthlyBill: async () => ({ success: true }) };
}

describe('billing-report-handler', () => {
  it('cancel sin caller → 401 con mensaje legacy', async () => {
    const res = await handleCancelSubscription(new FakeGateway(seedStore()), null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'No autorizado' });
  });

  it('cancel con stripe → 200 { success: true } y cancela externo', async () => {
    const calls: unknown[] = [];
    const res = await handleCancelSubscription(new FakeGateway(seedStore()), self, {
      now: NOW,
      billing: fakeBilling(calls),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(calls).toEqual([{ gateway: 'stripe', subscriptionId: 'sub_9' }]);
  });

  it('cancel sin suscripción → 404 legacy', async () => {
    const store = seedStore();
    delete (store.users['tutor1'] as Record<string, unknown>)['subscription'];
    const res = await handleCancelSubscription(new FakeGateway(store), self, { now: NOW });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Suscripción no encontrada' });
  });

  it('reporte sin auth (igual que el legacy) → 200 con summary', async () => {
    const res = await handleBillingReport(new FakeGateway(seedStore()), null, {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalActiveTutors).toBe(2);
    expect(body.tutors).toHaveLength(2);
    // tutor2: 2000 * 10% = 200 primero; tutor1 fijo 100
    expect(body.tutors[0].id).toBe('tutor2');
    expect(body.tutors[0].billedAmount).toBe(200);
  });

  it('cron → 200 { success, processed, results } con cobro fake', async () => {
    const store = seedStore();
    store.users['tutor1'] = {
      ...(store.users['tutor1'] as RawDoc),
      billingCycle: { currentCycleStart: new Date('2026-08-10T00:00:00Z'), currentCycleEnd: new Date('2026-09-10T00:00:00Z'), promotionalCycleIndex: 0, monthlySalesAmount: 0 },
      payment: { stripeCustomerId: 'cus_1' },
      subscription: { status: 'active', planId: 'pro', planName: 'Pro', fixedAmount: 100, type: 'fixed' },
    };
    store.subscriptionPlans['pro'] = { name: 'Pro', pricing: { billingCycleMonths: 1 } };
    const res = await handleBillingCron(new FakeGateway(store), null, { now: NOW, charge: fakeCharge() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.results).toEqual([{ userId: 'tutor1', success: true, charged: 100 }]);
  });
});

describe('subscription-admin-handlers', () => {
  it('listar planes sin auth (igual que el legacy) → 200 { plans }', async () => {
    const res = await handleListPlans(new FakeGateway(seedStore()), null);
    expect(res.status).toBe(200);
    expect((await res.json()).plans.map((p: { id: string }) => p.id)).toEqual(['pro']);
  });

  it('crear plan no-admin → 401 legacy', async () => {
    const res = await handleCreatePlan(new FakeGateway(seedStore()), self, { name: 'X' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'No autorizado' });
  });

  it('crear plan válido → 201 { plan }', async () => {
    const res = await handleCreatePlan(new FakeGateway(seedStore()), admin, {
      name: 'Nuevo',
      type: 'fixed',
      price: 50,
      durationMonths: 6,
      features: ['a'],
      permissions: { academic_management: true },
      limits: { maxCourses: 3, maxStudents: 30 },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plan.id).toBe('generated-id');
    expect(body.plan.name).toBe('Nuevo');
  });

  it('crear plan duplicado → 400 mensaje legacy', async () => {
    const res = await handleCreatePlan(new FakeGateway(seedStore()), admin, {
      name: 'Pro',
      type: 'fixed',
      price: 50,
      durationMonths: 6,
      features: ['a'],
      permissions: { academic_management: true },
      limits: { maxCourses: 3, maxStudents: 30 },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Ya existe un plan con ese nombre' });
  });

  it('actualizar sin id → 400 ID is required', async () => {
    const res = await handleUpdatePlan(new FakeGateway(seedStore()), admin, null, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'ID is required' });
  });

  it('actualizar válido → 200 mensaje legacy', async () => {
    const res = await handleUpdatePlan(new FakeGateway(seedStore()), admin, 'pro', { name: 'Pro 2' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Plan actualizado exitosamente', id: 'pro' });
  });

  it('eliminar → 200 mensaje legacy', async () => {
    const gateway = new FakeGateway(seedStore());
    const res = await handleDeletePlan(gateway, admin, 'pro');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Plan eliminado exitosamente', id: 'pro' });
    expect(gateway.deleted).toEqual([{ collectionPath: 'subscriptionPlans', id: 'pro' }]);
  });

  it('planes públicos → 200 { plans, debug } con dual-read', async () => {
    const store = seedStore();
    store['subscription-plans']['leg'] = { name: 'Legacy' };
    const res = await handlePublicPlans(new FakeGateway(store), null);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.debug).toEqual({ camelCaseSize: 1, kebabCaseSize: 1 });
    expect(body.plans.map((p: { _source: string }) => p._source).sort()).toEqual(['camelCase', 'kebab-case']);
  });

  it('listar tutores no-admin → 401; admin → 200 con conteos', async () => {
    const forbidden = await handleListTutorSubscriptions(new FakeGateway(seedStore()), self);
    expect(forbidden.status).toBe(401);
    const res = await handleListTutorSubscriptions(new FakeGateway(seedStore()), admin);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.active).toBe(2);
  });

  it('detalle tutor inexistente → 404 legacy', async () => {
    const res = await handleGetTutorSubscription(new FakeGateway(seedStore()), admin, 'zzz');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Tutor not found' });
  });

  it('detalle tutor → 200 { tutor }', async () => {
    const res = await handleGetTutorSubscription(new FakeGateway(seedStore()), admin, 'tutor1');
    expect(res.status).toBe(200);
    expect((await res.json()).tutor.id).toBe('tutor1');
  });

  it('actualizar tutor inválido → 400 { error, field }', async () => {
    const res = await handleUpdateTutorSubscription(new FakeGateway(seedStore()), admin, 'tutor1', {
      subscriptionType: 'fixed',
      fixedAmount: 0,
      invitationsPerCourse: 10,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'El monto fijo debe ser mayor a 0', field: 'fixedAmount' });
  });

  it('actualizar tutor válido → 200 legacy', async () => {
    const res = await handleUpdateTutorSubscription(new FakeGateway(seedStore()), admin, 'tutor1', {
      subscriptionType: 'fixed',
      fixedAmount: 120,
      invitationsPerCourse: 10,
      status: 'active',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Subscription updated successfully');
  });
});
