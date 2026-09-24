/**
 * F1.1 (TDD rojo) — Handlers de webhooks con gateway falso.
 * Sin `caller` autenticado (los webhooks se autentican por firma HMAC en
 * el borde, no por sesión): firma `(gateway, ...args)`. Contratos legacy
 * exactos: stripe `{received:true}`/500 `Fallo interno`; subscriptions
 * `{received:true}`/400 mensaje; MP siempre 200 `{received:true}`;
 * getnet 200/400/404/500 exactos.
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '@/data/firestore/gateway';
import type { PaymentProvider } from '@/domain/commerce/payment-provider';

import { processStripeWebhook as handleStripeWebhookEvent } from '@/domain/commerce/use-cases/stripe-webhook-use-case';
import { processMercadoPagoWebhook as handleMercadoPagoWebhookEvent } from '@/domain/commerce/use-cases/mp-webhook-use-case';
import { processGetnetWebhook as handleGetnetWebhookEvent } from '@/domain/commerce/use-cases/getnet-webhook-use-case';
// Notar que `handleSubscriptionsWebhookEvent` se movió temporalmente o no se usa como endpoint independiente en las rutas modificadas,
// pero si existe en las pruebas, deberíamos importarlo también. Para que el test compile vamos a importarlo temporalmente de donde estaba, 
// o simplemente importar el que hicimos. Ah! No hicimos un subscriptions-webhook-use-case.ts.
import { handleSubscriptionsWebhookEvent } from '../webhook-handlers';

type Store = Record<string, Record<string, Record<string, unknown>>>;

function getPath(raw: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, raw);
}

function snap(id: string, raw: Record<string, unknown>): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => getPath(raw, field) === value)
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
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => getPath(raw, field1) === value1 && getPath(raw, field2) === value2)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async createDoc(): Promise<void> {
    throw new Error('no usado');
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
}

function seed(): Store {
  return {
    users: {
      t1: {
        email: 'tutor@fastoria.com',
        displayName: 'Tutora',
        subscription: { planId: 'plan-pro', status: 'active', gatewaySubscriptionId: 'sub_9' },
      },
    },
    subscriptionPlans: {
      'plan-pro': { name: 'Pro', billingCycleMonths: 1, gracePeriodDays: 7 },
    },
    salesPages: {},
    systemPaymentMethods: {
      sys1: { type: 'mercadopago', isActive: true, config: { accessToken: 'tok_sys' } },
    },
    pending_orders: {
      ord_1: {
        status: 'pending',
        landingId: 'page1',
        buyerEmail: 'alu@x.com',
        buyerName: 'Alu',
        tutorId: 'mentor1',
        referidoId: null,
      },
    },
  };
}

const silent = {
  notifier: {
    sendTrialEnding: async () => undefined,
    sendSubscriptionActivated: async () => undefined,
    sendPaymentFailed: async () => undefined,
    sendAccountSuspended: async () => undefined,
  },
  billing: { cancelExternalSubscription: async () => undefined },
};

describe('handleStripeWebhookEvent (contrato stripe legacy)', () => {
  it('checkout.session.completed → enlaza suscripción y 200 {received:true}', async () => {
    const store = seed();
    const gw = new FakeGateway(store);
    const res = await handleStripeWebhookEvent(
      gw,
      {
        type: 'checkout.session.completed',
        data: {
          object: { mode: 'subscription', subscription: 'sub_123', metadata: { mentorId: 't1' } },
        },
      },
      silent,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(gw.updates).toEqual([
      {
        collectionPath: 'users',
        id: 't1',
        patch: { 'subscription.gateway': 'stripe', 'subscription.gatewaySubscriptionId': 'sub_123' },
      },
    ]);
  });

  it('invoice.paid con lookup → succeeded y 200; sin match → 200 sin escrituras', async () => {
    const store = seed();
    const gw = new FakeGateway(store);
    const res = await handleStripeWebhookEvent(
      gw,
      {
        type: 'invoice.paid',
        data: { object: { subscription: 'sub_9', lines: { data: [{ period: { end: 1760481600 } }] } } },
      },
      silent,
    );
    expect(res.status).toBe(200);
    expect(gw.updates[0]?.patch['subscription.status']).toBe('active');

    const gw2 = new FakeGateway(seed());
    const res2 = await handleStripeWebhookEvent(
      gw2,
      { type: 'invoice.payment_failed', data: { object: { subscription: 'sub_x' } } },
      silent,
    );
    expect(res2.status).toBe(200);
    expect(gw2.updates).toHaveLength(0);
  });

  it('evento desconocido → 200 {received:true}', async () => {
    const res = await handleStripeWebhookEvent(
      new FakeGateway(seed()),
      { type: 'charge.refunded', data: { object: {} } },
      silent,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});

describe('handleSubscriptionsWebhookEvent (contrato subscriptions legacy)', () => {
  it('stripe created con tutorId directo → 200 sin lookup', async () => {
    const store = seed();
    const gw = new FakeGateway(store);
    const res = await handleSubscriptionsWebhookEvent(
      gw,
      'stripe',
      { type: 'customer.subscription.created', data: { object: { id: 'sub_s', metadata: { tutorId: 't1' } } } },
      silent,
    );
    expect(res.status).toBe(200);
    expect(gw.updates).toEqual([
      {
        collectionPath: 'users',
        id: 't1',
        patch: { 'subscription.gateway': 'stripe', 'subscription.gatewaySubscriptionId': 'sub_s' },
      },
    ]);
  });

  it('getnet payment.succeeded → 200; sin tutorId → 200 sin escrituras', async () => {
    const gw = new FakeGateway(seed());
    const res = await handleSubscriptionsWebhookEvent(
      gw,
      'getnet',
      { event_type: 'payment.succeeded', metadata: { tutorId: 't1' } },
      silent,
    );
    expect(res.status).toBe(200);
    expect(gw.updates.length).toBeGreaterThan(0);

    const gw2 = new FakeGateway(seed());
    const res2 = await handleSubscriptionsWebhookEvent(
      gw2,
      'getnet',
      { event_type: 'payment.failed', metadata: {} },
      silent,
    );
    expect(res2.status).toBe(200);
    expect(gw2.updates).toHaveLength(0);
  });
});

describe('handleMercadoPagoWebhookEvent (siempre 200 legacy)', () => {
  const fakeProvider: PaymentProvider = {
    createSubscriptionPreference: async () => ({ id: 'p' }),
    getPayment: async (_token, id) => ({
      id,
      externalReference: JSON.stringify({ userId: 'u1', planId: 'plan-pro' }),
      status: 'approved',
    }),
  };

  it('tipo no-payment → 200 {received:true}', async () => {
    const res = await handleMercadoPagoWebhookEvent(
      new FakeGateway(seed()),
      { type: 'merchant_order', dataId: 'x' },
      { provider: fakeProvider },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it('payment sin external_reference → 200 {received:true} sin inscribir', async () => {
    let enrollCalls = 0;
    const res = await handleMercadoPagoWebhookEvent(
      new FakeGateway(seed()),
      { type: 'payment', dataId: 'pay_1' },
      {
        provider: {
          createSubscriptionPreference: async () => ({ id: 'p' }),
          getPayment: async (_t: any, id: any) => ({ id, status: 'approved' as any }),
        },
        enrollment: {
          completeEnrollment: async () => {
            enrollCalls += 1;
            return { success: true };
          },
        },
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(enrollCalls).toBe(0);
  });

  it('payment con planId → activa suscripción con mismos args y 200', async () => {
    let seen: unknown = null;
    const res = await handleMercadoPagoWebhookEvent(
      new FakeGateway(seed()),
      { type: 'payment', dataId: 'pay_9' },
      {
        provider: fakeProvider,
        subscriptionActivation: {
          activateSubscription: async (input: any) => {
            seen = input;
            return { success: true, userId: 'u1' };
          },
        },
      },
    );
    expect(res.status).toBe(200);
    expect(seen).toMatchObject({ paymentId: 'pay_9', planId: 'plan-pro', status: 'approved' });
  });

  it('sin métodos MP configurados → 200 {received:true, error}', async () => {
    const store = seed();
    store.systemPaymentMethods = {};
    const res = await handleMercadoPagoWebhookEvent(
      new FakeGateway(store),
      { type: 'payment', dataId: 'pay_1' },
      { provider: fakeProvider },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(typeof body.error).toBe('string');
  });
});

describe('handleGetnetWebhookEvent (contrato getnet legacy)', () => {
  it('APPROVED → inscribe + completed y 200', async () => {
    let seen: unknown = null;
    const res = await handleGetnetWebhookEvent(
      new FakeGateway(seed()),
      { status: 'APPROVED', orderId: 'ord_1', paymentId: 'pay_gn_1', payload: { status: 'APPROVED' } },
      {
        ...silent,
        enrollment: {
          completeEnrollment: async (input) => {
            seen = input;
            return { success: true, enrollmentId: 'e1' };
          },
        },
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(seen).toMatchObject({ paymentId: 'pay_gn_1', status: 'approved' });
  });

  it('sin orderId → 400 exacto; orden inexistente → 404 exacto', async () => {
    const r1 = await handleGetnetWebhookEvent(new FakeGateway(seed()), { status: 'APPROVED' }, silent);
    expect(r1.status).toBe(400);
    expect(await r1.json()).toEqual({ error: 'Order ID no encontrado en payload' });

    const r2 = await handleGetnetWebhookEvent(
      new FakeGateway(seed()),
      { status: 'APPROVED', orderId: 'ord_x' },
      silent,
    );
    expect(r2.status).toBe(404);
    expect(await r2.json()).toEqual({ error: 'Orden no encontrada' });
  });

  it('status no aprobado → actualiza orden sin inscribir y 200', async () => {
    const store = seed();
    let enrollCalls = 0;
    const res = await handleGetnetWebhookEvent(
      new FakeGateway(store),
      { status: 'REJECTED', orderId: 'ord_1', payload: { status: 'REJECTED' } },
      {
        ...silent,
        enrollment: {
          completeEnrollment: async () => {
            enrollCalls += 1;
            return { success: true };
          },
        },
      },
    );
    expect(res.status).toBe(200);
    expect(enrollCalls).toBe(0);
    expect(store.pending_orders['ord_1']?.status).toBe('REJECTED');
  });
});
