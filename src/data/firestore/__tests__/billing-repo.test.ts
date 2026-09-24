/**
 * F0.3 (TDD rojo) — Métodos nuevos (aditivos) del repo de suscripciones:
 * lecturas de billing/reportes, directorio de planes (dual-read
 * `subscriptionPlans` + `subscription-plans` encapsulado) y directorio
 * de tutores. Aserta colecciones/paths/filtros exactos del legacy.
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

class FakeBillingGateway implements FirestoreGateway {
  readonly arrayContainsCalls: { collectionPath: string; field: string; value: unknown }[] = [];
  readonly fieldCalls: { collectionPath: string; field: string; value: unknown }[] = [];
  readonly twoFieldCalls: { collectionPath: string; f1: string; v1: unknown; f2: string; v2: unknown }[] = [];
  readonly listed: string[] = [];
  readonly got: { collectionPath: string; id: string }[] = [];
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly createdAuto: { collectionPath: string; data: Record<string, unknown> }[] = [];
  readonly created: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];
  readonly deleted: { collectionPath: string; id: string }[] = [];
  readonly subCreates: { parent: string; parentId: string; sub: string; id: string }[] = [];

  constructor(private readonly store: Store, private readonly minimal = false) {}

  async getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null> {
    this.got.push({ collectionPath, id });
    return snap(id, this.store[collectionPath]?.[id]);
  }

  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    this.listed.push(collectionPath);
    return {
      docs: Object.entries(this.store[collectionPath] ?? {}).map(
        ([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike,
      ),
    };
  }

  async queryByField(collectionPath: string, field: string, value: unknown): Promise<QuerySnapshotLike> {
    this.fieldCalls.push({ collectionPath, field, value });
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
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

  async batchWrite(_ops: BatchUpdateOp[]): Promise<void> {
    throw new Error('no usado');
  }

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>): Promise<void> {
    this.created.push({ collectionPath, id, data });
    this.store[collectionPath][id] = data;
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>): Promise<void> {
    this.updates.push({ collectionPath, id, patch });
  }

  async deleteDoc(collectionPath: string, id: string): Promise<void> {
    this.deleted.push({ collectionPath, id });
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
  ): Promise<void> {
    this.subCreates.push({ parent: parentCollection, parentId, sub: subCollection, id });
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async queryArrayContains(collectionPath: string, field: string, value: unknown): Promise<QuerySnapshotLike> {
    if (this.minimal) throw new Error('no implementado en gateway mínimo');
    this.arrayContainsCalls.push({ collectionPath, field, value });
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => Array.isArray(raw[field]) && (raw[field] as unknown[]).includes(value))
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async createDocAutoId(collectionPath: string, data: Record<string, unknown>): Promise<string> {
    if (this.minimal) throw new Error('no implementado en gateway mínimo');
    this.createdAuto.push({ collectionPath, data });
    return 'auto-id-1';
  }
}

function seed(): Store {
  return {
    users: {
      m1: {
        displayName: 'Ana',
        email: 'm1@x.com',
        username: 'ana',
        photoURL: 'http://pic',
        roles: ['mentor'],
        subscription: { status: 'active', type: 'fixed' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
        billingCycle: { currentCycleEnd: new Date('2026-09-10T00:00:00Z'), promotionalCycleIndex: 2, monthlySalesAmount: 7 },
        payment: { stripeCustomerId: 'cus_1' },
      },
      u2: { displayName: 'Alu', email: 'u2@x.com', roles: ['student'] },
      m9: { displayName: 'SinSub', email: 'm9@x.com', roles: ['mentor'] },
    },
    salesPages: {
      sp1: { mentorId: 'm1', courseId: 'c1', price: 100, isActive: true, stats: { conversions: 2 } },
    },
    enrollments: {
      e1: { courseId: 'c1', isDirect: true, enrolledAt: new Date('2026-09-10T00:00:00Z'), mentorId: 'm1', status: 'active', studentId: 's1' },
      e2: { courseId: 'c1', isDirect: false, mentorId: 'm1', status: 'active', studentId: 's2' },
    },
    courses: {
      c1: { mentorId: 'm1', isActive: true },
      c2: { mentorId: 'm1', isActive: false },
    },
    subscriptionPlans: {
      pro: { name: 'Pro', createdAt: new Date('2026-01-01T00:00:00Z') },
    },
    'subscription-plans': {
      leg: { name: 'Legacy' },
    },
  };
}

describe('FirestoreSubscriptionRepository (F0.3 aditivo)', () => {
  it('listMentorUsers usa array-contains sobre `users.roles`', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listMentorUsers();
    expect(gateway.arrayContainsCalls).toEqual([{ collectionPath: 'users', field: 'roles', value: 'mentor' }]);
    expect(rows.map((r) => r.id).sort()).toEqual(['m1', 'm9']);
    expect(rows.find((r) => r.id === 'm1')).toMatchObject({ displayName: 'Ana', email: 'm1@x.com' });
    // Sin suscripción → null (el use-case aplica el default, como el legacy)
    expect(rows.find((r) => r.id === 'm9')?.subscription).toBeNull();
  });

  it('listMentorUsers sin array-contains en el gateway → listDocs + filtro en memoria', async () => {
    const gateway = new FakeBillingGateway(seed(), true);
    gateway.queryArrayContains = undefined as never;
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listMentorUsers();
    expect(gateway.listed).toEqual(['users']);
    expect(rows.map((r) => r.id).sort()).toEqual(['m1', 'm9']);
  });

  it('listSalesPages lee `salesPages` completa con mapeo de precio/conversiones', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listSalesPages();
    expect(gateway.listed).toEqual(['salesPages']);
    expect(rows).toEqual([{ mentorId: 'm1', courseId: 'c1', price: 100, isActive: true, conversions: 2 }]);
  });

  it('listDirectEnrollments filtra `enrollments` por isDirect == true', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listDirectEnrollments();
    expect(gateway.fieldCalls).toEqual([{ collectionPath: 'enrollments', field: 'isDirect', value: true }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ courseId: 'c1' });
    expect(rows[0]?.enrolledAt).toBeInstanceOf(Date);
  });

  it('listActiveCourses filtra `courses` por isActive == true', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listActiveCourses();
    expect(gateway.fieldCalls).toEqual([{ collectionPath: 'courses', field: 'isActive', value: true }]);
    expect(rows).toEqual([{ mentorId: 'm1' }]);
  });

  it('listBillableUsers trae solo status active/trial con ciclo y customer', async () => {
    const store = seed();
    store.users['mt'] = { displayName: 'Trial', email: 't@x.com', roles: ['mentor'], subscription: { status: 'trial' } };
    const gateway = new FakeBillingGateway(store);
    const repo = new FirestoreSubscriptionRepository(gateway);
    const rows = await repo.listBillableUsers();
    expect(gateway.listed).toEqual(['users']);
    expect(rows.map((r) => r.id).sort()).toEqual(['m1', 'mt']);
    const m1 = rows.find((r) => r.id === 'm1')!;
    expect(m1.stripeCustomerId).toBe('cus_1');
    expect(m1.cycleEnd).toBeInstanceOf(Date);
    expect(m1.promotionalCycleIndex).toBe(2);
    expect(m1.monthlySalesAmount).toBe(7);
  });

  it('listActiveStudentIds usa mentorId == + status == active', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const ids = await repo.listActiveStudentIds('m1');
    expect(gateway.twoFieldCalls).toEqual([
      { collectionPath: 'enrollments', f1: 'mentorId', v1: 'm1', f2: 'status', v2: 'active' },
    ]);
    expect(ids.sort()).toEqual(['s1', 's2']);
  });

  it('planes: listPlans, dual-read, findPlanIdsByName, create/update/delete', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    const plans = await repo.listPlans();
    expect(plans.map((p) => p.id)).toEqual(['pro']);
    const dual = await repo.listPlansDual();
    expect(dual.camelCase.map((p) => p.id)).toEqual(['pro']);
    expect(dual.kebabCase.map((p) => p.id)).toEqual(['leg']);
    expect(gateway.listed).toEqual(['subscriptionPlans', 'subscriptionPlans', 'subscription-plans']);
    expect(await repo.findPlanIdsByName('Pro')).toEqual(['pro']);
    const id = await repo.createPlan({ name: 'Nuevo' });
    expect(id).toBe('auto-id-1');
    expect(gateway.createdAuto[0]?.collectionPath).toBe('subscriptionPlans');
    expect(gateway.createdAuto[0]?.data).toMatchObject({ name: 'Nuevo' });
    await repo.updatePlan('pro', { name: 'Pro 2' });
    expect(gateway.updates[0]).toMatchObject({ collectionPath: 'subscriptionPlans', id: 'pro' });
    await repo.deletePlan('pro');
    expect(gateway.deleted).toEqual([{ collectionPath: 'subscriptionPlans', id: 'pro' }]);
  });

  it('getMentorById lee `users` doc(id) y null si no existe', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    expect((await repo.getMentorById('m1'))?.id).toBe('m1');
    expect(await repo.getMentorById('zzz')).toBeNull();
    expect(gateway.got).toEqual([
      { collectionPath: 'users', id: 'm1' },
      { collectionPath: 'users', id: 'zzz' },
    ]);
  });

  it('writeTutorSubscription escribe `users` con updatedBy admin y fechas al activar', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    await repo.writeTutorSubscription('m1', { status: 'active' }, { activateWithDates: true });
    const patch = gateway.updates[0]?.patch as Record<string, unknown> | undefined;
    expect(gateway.updates[0]).toMatchObject({ collectionPath: 'users', id: 'm1' });
    const sub = patch?.['subscription'] as Record<string, unknown>;
    expect(sub).toMatchObject({ status: 'active', updatedBy: 'admin', endDate: null });
    expect(sub['updatedAt']).toEqual({ __fakeTimestamp: true });
    expect(sub['startDate']).toEqual({ __fakeTimestamp: true });
  });

  it('writeTutorSubscription sin activar no agrega startDate', async () => {
    const gateway = new FakeBillingGateway(seed());
    const repo = new FirestoreSubscriptionRepository(gateway);
    await repo.writeTutorSubscription('m1', { status: 'inactive' }, { activateWithDates: false });
    const sub = gateway.updates[0]?.patch?.['subscription'] as Record<string, unknown> | undefined;
    expect(sub?.['startDate']).toBeUndefined();
    expect(sub?.['endDate']).toBeUndefined();
  });
});
