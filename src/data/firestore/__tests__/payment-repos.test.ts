/**
 * F0.2 (TDD rojo) — Repos de pagos con gateway falso en memoria.
 * Sin Firebase real. Aserta colecciones/paths exactos del legacy:
 * `transferOrders`, `systemPaymentMethods`, subcolección
 * `users/{uid}/paymentMethods`, `users` (perfil mentor),
 * `mp_seller_mappings`. Sin cambios de storage.
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '../gateway';
import { FirestoreTransferOrderRepository } from '../transfer-order-repo';
import { FirestorePaymentMethodRepository } from '../payment-method-repo';
import { FirestoreSalesPageLookup } from '../sales-lookup-repo';

type Store = Record<string, Record<string, Record<string, unknown>>>;
type SubStore = Record<string, Record<string, Record<string, Record<string, unknown>>>>;

function snap(id: string, raw: Record<string, unknown> | undefined): DocSnapshotLike | null {
  if (raw === undefined) return null;
  return { exists: true, id, data: () => raw };
}

/** Falso local con subcolecciones `users/{uid}/paymentMethods`. */
class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly creates: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];

  constructor(
    private readonly store: Store,
    private readonly subs: SubStore = {},
  ) {}

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

  async createDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.creates.push({ collectionPath, id, data });
    this.store[collectionPath][id] = data;
  }

  async updateDoc(
    collectionPath: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
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

  async listSubDocs(
    parentCollection: string,
    parentId: string,
    subCollection: string,
  ): Promise<QuerySnapshotLike> {
    const docs = Object.entries(this.subs[parentCollection]?.[parentId]?.[subCollection] ?? {}).map(
      ([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike,
    );
    return { docs };
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
}

function seed(): { store: Store; subs: SubStore } {
  return {
    store: {
      transferOrders: {
        tx1: {
          id: 'tx1',
          pageId: 'page1',
          mentorId: 'mentor1',
          studentEmail: 'alu@x.com',
          status: 'pending',
        },
      },
      systemPaymentMethods: {
        sys1: {
          name: 'Mercado Pago',
          type: 'mercadopago',
          description: 'd',
          icon: 'i',
          isActive: true,
          config: { accessToken: 'tok_sys' },
        },
        sys2: { name: 'Viejo', type: 'stripe', isActive: false, config: {} },
      },
      users: {
        mentor1: {
          email: 'mentor@x.com',
          displayName: 'Mentor Uno',
          profile: { mercadopago: { accessToken: 'tok_legacy' } },
        },
      },
      mp_seller_mappings: {
        'seller9': { mentorId: 'mentor1' },
      },
      salesPages: {
        page1: { mentorId: 'mentor1', price: 5000, title: 'Curso X' },
      },
    },
    subs: {
      users: {
        mentor1: {
          paymentMethods: {
            pm1: { type: 'mercadopago', isActive: true, config: { accessToken: 'tok_tutor' } },
            pm2: { type: 'transfer', isActive: true, config: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' } },
            pm3: { type: 'mercadopago', isActive: false, config: {} },
          },
        },
      },
    },
  };
}

describe('FirestoreTransferOrderRepository', () => {
  it('create escribe en `transferOrders` doc(orderId) con status pending + timestamps', async () => {
    const { store, subs } = seed();
    const gateway = new FakeGateway(store, subs);
    const repo = new FirestoreTransferOrderRepository(gateway);
    await repo.create({
      id: 'txfr_page1_123',
      pageId: 'page1',
      pageTitle: 'Curso X',
      mentorId: 'mentor1',
      mentorEmail: 'mentor@x.com',
      studentEmail: 'alu@x.com',
      studentName: 'Alu',
      amount: 5000,
      bankDetails: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' },
      referenceCode: 'ALU-ABC123',
      referidoId: null,
      status: 'pending',
    });
    expect(gateway.creates).toHaveLength(1);
    expect(gateway.creates[0]?.collectionPath).toBe('transferOrders');
    expect(gateway.creates[0]?.id).toBe('txfr_page1_123');
    expect(gateway.creates[0]?.data).toMatchObject({
      id: 'txfr_page1_123',
      pageId: 'page1',
      mentorId: 'mentor1',
      studentEmail: 'alu@x.com',
      status: 'pending',
      referidoId: null,
    });
    expect(gateway.creates[0]?.data.createdAt).toEqual({ __fakeTimestamp: true });
    expect(gateway.creates[0]?.data.updatedAt).toEqual({ __fakeTimestamp: true });
  });

  it('findById lee `transferOrders` doc(orderId); inexistente → null', async () => {
    const { store, subs } = seed();
    const repo = new FirestoreTransferOrderRepository(new FakeGateway(store, subs));
    expect((await repo.findById('tx1'))?.status).toBe('pending');
    expect(await repo.findById('nope')).toBeNull();
  });

  it('markRejected actualiza status + updatedAt + rejectedAt (shape legacy)', async () => {
    const { store, subs } = seed();
    const gateway = new FakeGateway(store, subs);
    const repo = new FirestoreTransferOrderRepository(gateway);
    await repo.markRejected('tx1');
    expect(gateway.updates).toEqual([
      {
        collectionPath: 'transferOrders',
        id: 'tx1',
        patch: {
          status: 'rejected',
          updatedAt: { __fakeTimestamp: true },
          rejectedAt: { __fakeTimestamp: true },
        },
      },
    ]);
  });

  it('markApproved actualiza status + updatedAt + approvedAt + enrollmentId', async () => {
    const { store, subs } = seed();
    const gateway = new FakeGateway(store, subs);
    const repo = new FirestoreTransferOrderRepository(gateway);
    await repo.markApproved('tx1', 'enroll_1');
    expect(gateway.updates).toEqual([
      {
        collectionPath: 'transferOrders',
        id: 'tx1',
        patch: {
          status: 'approved',
          updatedAt: { __fakeTimestamp: true },
          approvedAt: { __fakeTimestamp: true },
          enrollmentId: 'enroll_1',
        },
      },
    ]);
  });
});

describe('FirestorePaymentMethodRepository', () => {
  it('findSystemMethodById lee `systemPaymentMethods` doc(id)', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    const m = await repo.findSystemMethodById('sys1');
    expect(m?.id).toBe('sys1');
    expect(m?.type).toBe('mercadopago');
    expect(m?.config).toEqual({ accessToken: 'tok_sys' });
    expect(await repo.findSystemMethodById('nope')).toBeNull();
  });

  it('findFirstActiveSystemMethod filtra isActive==true (query legacy)', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    expect((await repo.findFirstActiveSystemMethod())?.id).toBe('sys1');
  });

  it('listActiveSystemMethods retorna solo activos para el route methods', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    const list = await repo.listActiveSystemMethods();
    expect(list.map((m) => m.id)).toEqual(['sys1']);
  });

  it('findTutorMethodByType filtra subcolección type== + isActive==', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    const mp = await repo.findTutorMethodByType('mentor1', 'mercadopago');
    expect(mp?.id).toBe('pm1');
    expect(mp?.config).toEqual({ accessToken: 'tok_tutor' });
    const tr = await repo.findTutorMethodByType('mentor1', 'transfer');
    expect(tr?.id).toBe('pm2');
    expect(await repo.findTutorMethodByType('mentor1', 'stripe')).toBeNull();
  });

  it('hasActiveTutorMethod replica el check de trial (requiresPaymentMethod)', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    expect(await repo.hasActiveTutorMethod('mentor1')).toBe(true);
    expect(await repo.hasActiveTutorMethod('fantasma')).toBe(false);
  });

  it('getMentorProfile lee `users` con email/displayName + mercadopago legacy', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    const p = await repo.getMentorProfile('mentor1');
    expect(p?.email).toBe('mentor@x.com');
    expect(p?.displayName).toBe('Mentor Uno');
    expect(p?.mercadopagoConfig).toEqual({ accessToken: 'tok_legacy' });
    expect(await repo.getMentorProfile('fantasma')).toBeNull();
  });

  it('findMentorIdBySellerId lee `mp_seller_mappings` doc(sellerId)', async () => {
    const { store, subs } = seed();
    const repo = new FirestorePaymentMethodRepository(new FakeGateway(store, subs));
    expect(await repo.findMentorIdBySellerId('seller9')).toBe('mentor1');
    expect(await repo.findMentorIdBySellerId('otro')).toBeNull();
  });
});

describe('FirestoreSalesPageLookup', () => {
  it('findById lee `salesPages` con passthrough mentorId/price/title', async () => {
    const { store, subs } = seed();
    const repo = new FirestoreSalesPageLookup(new FakeGateway(store, subs));
    const page = await repo.findById('page1');
    expect(page?.mentorId).toBe('mentor1');
    expect(page?.price).toBe(5000);
    expect(page?.title).toBe('Curso X');
    expect(await repo.findById('nope')).toBeNull();
  });
});
