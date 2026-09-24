/**
 * F0.2 (TDD rojo) — Handlers de pagos con gateway falso.
 * Rutas públicas por contrato legacy (caller siempre null):
 * se verifican status codes y bodies exactos de cada route.
 * Puertos (MP/sesiones/billing/trials/notifier) inyectables.
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '@/data/firestore/gateway';
import type {
  BillingSetup,
  CheckoutSessions,
  PaymentProvider,
} from '@/domain/commerce/payment-provider';
import type {
  EnrollmentService,
  TransferNotifier,
  TrialActivator,
} from '@/domain/commerce/payment-ports';

import {
  handleCheckout,
  handleListSystemMethods,
  handleMpRedirect,
  handleMpWebhook,
  handleSetupBilling,
  handleSubscribe,
} from '../payment-handlers';
import { handleApproveTransfer, handleInitiateTransfer } from '../transfer-handlers';

type Store = Record<string, Record<string, Record<string, unknown>>>;
type SubStore = Record<string, Record<string, Record<string, Record<string, unknown>>>>;

function snap(id: string, raw: Record<string, unknown> | undefined): DocSnapshotLike | null {
  if (raw === undefined) return null;
  return { exists: true, id, data: () => raw };
}

class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  readonly creates: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];

  constructor(
    private readonly store: Store,
    private readonly subs: SubStore = {},
  ) {}

  async getDoc(collectionPath: string, id: string) {
    return snap(id, this.store[collectionPath]?.[id]);
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.creates.push({ collectionPath, id, data });
    this.store[collectionPath][id] = data;
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>) {
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

  async listSubDocs(parent: string, parentId: string, sub: string) {
    const docs = Object.entries(this.subs[parent]?.[parentId]?.[sub] ?? {}).map(
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
      subscriptionPlans: {
        'plan-pro': { name: 'Pro', price: 100, type: 'paid', trialDays: 0 },
        'plan-free': { name: 'Free', price: 0, type: 'free', trialDays: 0 },
        'plan-trial': { name: 'Trial', price: 100, type: 'paid', trialDays: 14 },
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
      },
      users: {
        mentor1: {
          email: 'mentor@x.com',
          displayName: 'Mentor Uno',
          profile: { mercadopago: { accessToken: 'tok_legacy' } },
        },
      },
      mp_seller_mappings: {
        seller9: { mentorId: 'mentor1' },
      },
      salesPages: {
        page1: { mentorId: 'mentor1', price: 5000, title: 'Curso X' },
      },
      transferOrders: {
        tx1: {
          id: 'tx1',
          pageId: 'page1',
          studentEmail: 'alu@x.com',
          studentName: 'Alu',
          mentorId: 'mentor1',
          referidoId: null,
          status: 'pending',
        },
      },
    },
    subs: {
      users: {
        mentor1: {
          paymentMethods: {
            pm1: { type: 'mercadopago', isActive: true, config: { accessToken: 'tok_t' } },
            pm2: {
              type: 'transfer',
              isActive: true,
              config: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' },
            },
          },
        },
        tutor9: {
          paymentMethods: {
            pm9: { type: 'card', isActive: true, config: {} },
          },
        },
      },
    },
  };
}

const fakeProvider: PaymentProvider = {
  createSubscriptionPreference: async () => ({
    id: 'pref_1',
    initPoint: 'https://mp/init',
    sandboxInitPoint: 'https://mp/sandbox',
  }),
  getPayment: async (_token, id) => ({ id, externalReference: '{"a":1}', status: 'approved' }),
};

const fakeTrials: TrialActivator = {
  activateTrial: async () => ({ trialDays: 14, trialEndsAt: new Date('2026-09-28T12:00:00Z') }),
};

const fakeSessions: CheckoutSessions = {
  createSession: async () => ({ success: true, redirectUrl: 'https://pay/x', orderId: 'ord_1' }),
};

const fakeBilling: BillingSetup = {
  createSetup: async (_u, _e, baseUrl) => ({ url: `${baseUrl}/billing?ok=1`, customerId: 'cus_1' }),
};

const fakeEnrollment: EnrollmentService = {
  completeEnrollment: async (input) => ({
    success: true,
    enrollmentId: `enroll_${input.paymentId}`,
  }),
};

const fakeNotifier: TransferNotifier = {
  sendStudentNotice: async () => {},
  sendMentorNotice: async () => {},
};

describe('handleSubscribe (público, contrato subscribe legacy)', () => {
  it('sin planId/email → 400 legacy', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(new FakeGateway(store, subs), null, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Plan ID y Email son obligatorios' });
  });

  it('plan inexistente → 404', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(new FakeGateway(store, subs), null, {
      planId: 'nope',
      email: 'a@x.com',
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'El plan no existe' });
  });

  it('plan gratuito → 200 { success, message }', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(
      new FakeGateway(store, subs),
      null,
      { planId: 'plan-free', email: 'a@x.com', userId: 'tutor9' },
      { provider: fakeProvider, trials: fakeTrials },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Plan activado correctamente' });
  });

  it('trial sin método → 412 required_payment_method', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(
      new FakeGateway(store, subs),
      null,
      { planId: 'plan-trial', email: 'a@x.com', userId: 'sinmetodo' },
      { provider: fakeProvider, trials: fakeTrials },
    );
    expect(res.status).toBe(412);
    const body = await res.json();
    expect(body.error).toBe('required_payment_method');
    expect(typeof body.message).toBe('string');
  });

  it('trial con método → 200 con trialEndsAt ISO y mensaje legacy', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(
      new FakeGateway(store, subs),
      null,
      { planId: 'plan-trial', email: 'a@x.com', userId: 'tutor9' },
      { provider: fakeProvider, trials: fakeTrials },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, trial: true, trialDays: 14 });
    expect(typeof body.trialEndsAt).toBe('string');
    expect(body.message).toContain('período de prueba gratuita de 14 días');
  });

  it('cobro inmediato → 200 { id, init_point, sandbox_init_point }', async () => {
    const { store, subs } = seed();
    const res = await handleSubscribe(
      new FakeGateway(store, subs),
      null,
      { planId: 'plan-pro', email: 'n@x.com' },
      { provider: fakeProvider, trials: fakeTrials, appUrl: 'https://app.test' },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: 'pref_1',
      init_point: 'https://mp/init',
      sandbox_init_point: 'https://mp/sandbox',
    });
  });
});

describe('handleCheckout (público, contrato checkout legacy)', () => {
  it('sin parámetros → 400; página inexistente → 404', async () => {
    const { store, subs } = seed();
    const r1 = await handleCheckout(new FakeGateway(store, subs), null, {}, { sessions: fakeSessions });
    expect(r1.status).toBe(400);
    const r2 = await handleCheckout(
      new FakeGateway(store, subs),
      null,
      { pageId: 'nope', studentEmail: 'a@x.com', baseUrl: 'https://b' },
      { sessions: fakeSessions },
    );
    expect(r2.status).toBe(404);
    expect(await r2.json()).toEqual({ error: 'Página de venta no encontrada' });
  });

  it('ok devuelve passthrough de la pasarela con 200', async () => {
    const { store, subs } = seed();
    const res = await handleCheckout(
      new FakeGateway(store, subs),
      null,
      { pageId: 'page1', studentEmail: 'a@x.com', baseUrl: 'https://b' },
      { sessions: fakeSessions },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, redirectUrl: 'https://pay/x', orderId: 'ord_1' });
  });
});

describe('handleSetupBilling (público, contrato setup-billing legacy)', () => {
  it('sin userId → 400; inexistente → 404; ok → 200 { url }', async () => {
    const { store, subs } = seed();
    const r1 = await handleSetupBilling(new FakeGateway(store, subs), null, {}, { billing: fakeBilling });
    expect(r1.status).toBe(400);
    const r2 = await handleSetupBilling(
      new FakeGateway(store, subs),
      null,
      { userId: 'fantasma' },
      { billing: fakeBilling, baseUrl: 'https://app.test' },
    );
    expect(r2.status).toBe(404);
    const r3 = await handleSetupBilling(
      new FakeGateway(store, subs),
      null,
      { userId: 'mentor1' },
      { billing: fakeBilling, baseUrl: 'https://app.test' },
    );
    expect(r3.status).toBe(200);
    expect(await r3.json()).toEqual({ url: 'https://app.test/billing?ok=1' });
  });
});

describe('handleListSystemMethods (público, contrato methods legacy)', () => {
  it('mapea solo id/name/type/description/icon de activos', async () => {
    const { store, subs } = seed();
    const res = await handleListSystemMethods(new FakeGateway(store, subs), null);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      methods: [{ id: 'sys1', name: 'Mercado Pago', type: 'mercadopago', description: 'd', icon: 'i' }],
    });
  });
});

describe('handleInitiateTransfer / handleApproveTransfer (contrato transfer legacy)', () => {
  it('initiate ok → 200 { success, orderId, referenceCode, bankDetails, amount }', async () => {
    const { store, subs } = seed();
    const res = await handleInitiateTransfer(
      new FakeGateway(store, subs),
      null,
      { pageId: 'page1', studentEmail: 'Alu@X.com' },
      { notifier: fakeNotifier, nowMs: 1726230000000 },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, amount: 5000 });
    expect(body.bankDetails).toEqual({ alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' });
    expect(typeof body.orderId).toBe('string');
    expect(typeof body.referenceCode).toBe('string');
  });

  it('initiate sin método → 412', async () => {
    const { store } = seed();
    const res = await handleInitiateTransfer(
      new FakeGateway(store, { users: { mentor1: { paymentMethods: {} } } }),
      null,
      { pageId: 'page1', studentEmail: 'a@x.com' },
      { notifier: fakeNotifier },
    );
    expect(res.status).toBe(412);
  });

  it('approve reject → 200 { success, status rejected }; approve → enrollmentId', async () => {
    const s1 = seed();
    const r1 = await handleApproveTransfer(
      new FakeGateway(s1.store, s1.subs),
      null,
      { orderId: 'tx1', action: 'reject', mentorId: 'mentor1' },
      { enrollment: fakeEnrollment },
    );
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ success: true, status: 'rejected' });

    const s2 = seed();
    const r2 = await handleApproveTransfer(
      new FakeGateway(s2.store, s2.subs),
      null,
      { orderId: 'tx1', action: 'approve', mentorId: 'mentor1' },
      { enrollment: fakeEnrollment },
    );
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ success: true, status: 'approved', enrollmentId: 'enroll_tx1' });
  });

  it('approve otro mentor → 403; ya procesada → 409', async () => {
    const s1 = seed();
    const r1 = await handleApproveTransfer(
      new FakeGateway(s1.store, s1.subs),
      null,
      { orderId: 'tx1', action: 'approve', mentorId: 'otro' },
      { enrollment: fakeEnrollment },
    );
    expect(r1.status).toBe(403);

    const s2 = seed();
    s2.store.transferOrders['tx1'] = { ...s2.store.transferOrders['tx1'], status: 'approved' };
    const r2 = await handleApproveTransfer(
      new FakeGateway(s2.store, s2.subs),
      null,
      { orderId: 'tx1', action: 'approve', mentorId: 'mentor1' },
      { enrollment: fakeEnrollment },
    );
    expect(r2.status).toBe(409);
  });
});

describe('handleMpWebhook / handleMpRedirect (contrato webhook legacy)', () => {
  it('topic no-payment → 200 { received: true }', async () => {
    const { store, subs } = seed();
    const res = await handleMpWebhook(
      new FakeGateway(store, subs),
      null,
      { topic: 'merchant_order', id: 1, user_id: 9 },
      { provider: fakeProvider, enrollment: fakeEnrollment },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it('sin mapping → 404 Mentor mapping not found', async () => {
    const { store, subs } = seed();
    const res = await handleMpWebhook(
      new FakeGateway(store, subs),
      null,
      { type: 'payment', data: { id: 'pay1' }, user_id: 'nadie' },
      { provider: fakeProvider, enrollment: fakeEnrollment },
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Mentor mapping not found' });
  });

  it('payment válido → 200 { processed: true, ... }', async () => {
    const { store, subs } = seed();
    const res = await handleMpWebhook(
      new FakeGateway(store, subs),
      null,
      { type: 'payment', data: { id: 'pay1' }, user_id: 'seller9' },
      { provider: fakeProvider, enrollment: fakeEnrollment },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ processed: true, success: true });
  });

  it('redirect approved inscribe y redirige a enrolled=true', async () => {
    const { store, subs } = seed();
    const res = await handleMpRedirect(
      new FakeGateway(store, subs),
      null,
      { paymentId: 'pay1', status: 'approved', externalReference: '{"a":1}' },
      'https://app.test',
      { enrollment: fakeEnrollment },
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.test/dashboard/my-courses?enrolled=true');
  });

  it('redirect sin approval → my-courses', async () => {
    const { store, subs } = seed();
    const res = await handleMpRedirect(
      new FakeGateway(store, subs),
      null,
      { status: 'pending' },
      'https://app.test',
      { enrollment: fakeEnrollment },
    );
    expect(res.headers.get('location')).toBe('https://app.test/dashboard/my-courses');
  });
});
