/**
 * F1.1 (TDD rojo) — `handleGatewayEvent`: discrimina proveedor
 * (`stripe`/`getnet`/`mercadopago`/`subscriptions`) y tipo de evento ya
 * verificado, y delega a `handlePaymentResult` / puertos de
 * inscripción-activación con los mismos argumentos que hoy les pasa cada
 * webhook. Puro e idempotente: lookup por `gatewaySubscriptionId` antes
 * de escribir (igual que hoy `where('subscription.gatewaySubscriptionId','==')`);
 * sin lookup → sin escritura. Sin `firebase`/`next`/`@/data`/`@/lib`.
 */
import { describe, expect, it } from 'vitest';

import { handleGatewayEvent } from '../handle-gateway-event';
import type { SubscriptionRepository, UserBillingSnapshot } from '../../subscription-repository';
import type { SubscriptionPorts } from '../../subscription-ports';

interface FakeRepo extends SubscriptionRepository {
  patches: { uid: string; patch: Record<string, unknown> }[];
  lookups: string[];
  byGateway: Record<string, string>;
}

function fakeRepo(opts?: {
  users?: Record<string, UserBillingSnapshot | null>;
  byGateway?: Record<string, string>;
  planName?: string;
}): FakeRepo {
  const users = opts?.users ?? {};
  const byGateway = opts?.byGateway ?? {};
  const patches: { uid: string; patch: Record<string, unknown> }[] = [];
  const lookups: string[] = [];
  return {
    patches,
    lookups,
    byGateway,
    getPlan: async (planId: string) => ({
      id: planId,
      name: opts?.planName ?? 'Pro',
      billingCycleMonths: 1,
      gracePeriodDays: 7,
    }),
    getUserSubscription: async (uid: string) => users[uid] ?? null,
    updateSubscriptionFields: async (uid, patch) => {
      patches.push({ uid, patch });
    },
    listPageIdsByStatus: async () => [],
    suspendPages: async () => 2,
    reactivatePages: async () => 3,
    writeInvoice: async () => undefined,
    findTutorIdByGatewaySubscriptionId: async (id: string) => {
      lookups.push(id);
      return byGateway[id] ?? null;
    },
  } as FakeRepo;
}

function fakePorts(): SubscriptionPorts & {
  sent: Array<[string, unknown]>;
  canceled: { gateway: string; subscriptionId: string }[];
} {
  const sent: Array<[string, unknown]> = [];
  const canceled: { gateway: string; subscriptionId: string }[] = [];
  return {
    sent,
    canceled,
    notifier: {
      sendTrialEnding: async () => undefined,
      sendSubscriptionActivated: async (n: unknown) => {
        sent.push(['activated', n]);
      },
      sendPaymentFailed: async (n: unknown) => {
        sent.push(['failed', n]);
      },
      sendAccountSuspended: async (n: unknown) => {
        sent.push(['suspended', n]);
      },
    },
    billing: {
      cancelExternalSubscription: async (gateway: string, subscriptionId: string) => {
        canceled.push({ gateway, subscriptionId });
      },
    },
  };
}

function tutor(subscription: Record<string, unknown>): UserBillingSnapshot {
  return { uid: 't1', email: 'tutor@fastoria.com', displayName: 'Tutora', subscription };
}

describe('handleGatewayEvent — stripe', () => {
  it('checkout.session.completed → created con (tutorId, subscriptionId, stripe)', async () => {
    const repo = fakeRepo({ users: { t1: tutor({ planId: 'plan-pro' }) } });
    const result = await handleGatewayEvent(repo, fakePorts(), {}, {
      provider: 'stripe',
      eventType: 'checkout.session.completed',
      tutorId: 't1',
      subscriptionId: 'sub_123',
    });
    expect(result.ok).toBe(true);
    expect(repo.patches).toEqual([
      {
        uid: 't1',
        patch: { 'subscription.gateway': 'stripe', 'subscription.gatewaySubscriptionId': 'sub_123' },
      },
    ]);
  });

  it('invoice.paid → lookup por gatewaySubscriptionId y succeeded con nextBillingDate', async () => {
    const next = new Date('2026-10-14T12:00:00Z');
    const repo = fakeRepo({
      users: { t1: tutor({ status: 'active', planId: 'plan-pro' }) },
      byGateway: { sub_9: 't1' },
    });
    const ports = fakePorts();
    const result = await handleGatewayEvent(repo, ports, {}, {
      provider: 'stripe',
      eventType: 'invoice.paid',
      gatewaySubscriptionId: 'sub_9',
      nextBillingDate: next,
    });
    expect(result.ok).toBe(true);
    expect(repo.lookups).toEqual(['sub_9']);
    expect(repo.patches[0]?.patch['subscription.status']).toBe('active');
    expect(repo.patches[0]?.patch['subscription.nextBillingAt']).toEqual(next);
    expect(ports.sent[0]?.[0]).toBe('activated');
  });

  it('lookup sin match → ignored sin escrituras (igual que `if (!empty)`)', async () => {
    const repo = fakeRepo({ users: {}, byGateway: {} });
    const ports = fakePorts();
    const result = await handleGatewayEvent(repo, ports, {}, {
      provider: 'stripe',
      eventType: 'invoice.payment_failed',
      gatewaySubscriptionId: 'sub_fantasma',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.kind).toBe('ignored');
    expect(repo.patches).toHaveLength(0);
    expect(ports.sent).toHaveLength(0);
  });

  it('evento duplicado (mismo subscriptionId) → sin cancel externo ni doble efecto', async () => {
    const repo = fakeRepo({
      users: { t1: tutor({ planId: 'p', gateway: 'stripe', gatewaySubscriptionId: 'sub_1' }) },
      byGateway: { sub_1: 't1' },
    });
    const ports = fakePorts();
    const first = await handleGatewayEvent(repo, ports, {}, {
      provider: 'stripe',
      eventType: 'checkout.session.completed',
      tutorId: 't1',
      subscriptionId: 'sub_1',
    });
    const second = await handleGatewayEvent(repo, ports, {}, {
      provider: 'stripe',
      eventType: 'checkout.session.completed',
      tutorId: 't1',
      subscriptionId: 'sub_1',
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(ports.canceled).toHaveLength(0);
  });

  it('customer.subscription.deleted → canceled (suspende, igual que el engine)', async () => {
    const repo = fakeRepo({
      users: { t1: tutor({ status: 'active', planId: 'plan-pro' }) },
      byGateway: { sub_7: 't1' },
    });
    const ports = fakePorts();
    const result = await handleGatewayEvent(repo, ports, {}, {
      provider: 'stripe',
      eventType: 'customer.subscription.deleted',
      gatewaySubscriptionId: 'sub_7',
    });
    expect(result.ok).toBe(true);
    expect(repo.patches[0]?.patch['subscription.status']).toBe('suspended');
    expect(ports.sent).toEqual([['suspended', { email: 'tutor@fastoria.com', name: 'Tutora' }]]);
  });

  it('evento stripe desconocido → ignored sin escrituras', async () => {
    const repo = fakeRepo();
    const result = await handleGatewayEvent(repo, fakePorts(), {}, {
      provider: 'stripe',
      eventType: 'charge.refunded',
      gatewaySubscriptionId: 'sub_x',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.kind).toBe('ignored');
    expect(repo.patches).toHaveLength(0);
  });
});

describe('handleGatewayEvent — subscriptions (tutorId directo, sin lookup)', () => {
  it('customer.subscription.created stripe → created sin lookup', async () => {
    const repo = fakeRepo({ users: { t9: tutor({ planId: 'plan-pro' }) } });
    const result = await handleGatewayEvent(repo, fakePorts(), {}, {
      provider: 'subscriptions',
      eventType: 'customer.subscription.created',
      tutorId: 't9',
      subscriptionId: 'sub_s',
      gateway: 'stripe',
    });
    expect(result.ok).toBe(true);
    expect(repo.lookups).toHaveLength(0);
    expect(repo.patches).toEqual([
      {
        uid: 't9',
        patch: { 'subscription.gateway': 'stripe', 'subscription.gatewaySubscriptionId': 'sub_s' },
      },
    ]);
  });

  it('payment.succeeded getnet → succeeded sin nextBillingDate (la calcula el plan)', async () => {
    const repo = fakeRepo({ users: { t9: tutor({ status: 'active', planId: 'plan-pro' }) } });
    const result = await handleGatewayEvent(repo, fakePorts(), {}, {
      provider: 'subscriptions',
      eventType: 'payment.succeeded',
      tutorId: 't9',
      gateway: 'getnet',
    });
    expect(result.ok).toBe(true);
    expect(repo.patches[0]?.patch['subscription.status']).toBe('active');
  });

  it('sin tutorId → ignored (igual que `if (metadata?.tutorId)`)', async () => {
    const repo = fakeRepo();
    const result = await handleGatewayEvent(repo, fakePorts(), {}, {
      provider: 'subscriptions',
      eventType: 'payment.failed',
      gateway: 'getnet',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.kind).toBe('ignored');
    expect(repo.patches).toHaveLength(0);
  });
});

describe('handleGatewayEvent — mercadopago', () => {
  it('evento no-payment → received sin efectos', async () => {
    const repo = fakeRepo();
    const side = { enrollmentCalls: 0, activationCalls: 0 };
    const result = await handleGatewayEvent(repo, fakePorts(), {
      enrollment: { completeEnrollment: async () => { side.enrollmentCalls += 1; return { success: true }; } },
      subscriptionActivation: { activateSubscription: async () => { side.activationCalls += 1; return { success: true }; } },
    }, {
      provider: 'mercadopago',
      eventType: 'merchant_order',
      paymentId: 'pay_1',
    });
    expect(result.ok).toBe(true);
    expect(side.enrollmentCalls).toBe(0);
    expect(side.activationCalls).toBe(0);
  });

  it('payment con planId → activateSubscription con los mismos args del webhook', async () => {
    const repo = fakeRepo();
    let seen: unknown = null;
    const result = await handleGatewayEvent(repo, fakePorts(), {
      subscriptionActivation: {
        activateSubscription: async (input) => {
          seen = input;
          return { success: true, userId: 'u1' };
        },
      },
    }, {
      provider: 'mercadopago',
      eventType: 'payment',
      paymentId: 'pay_9',
      status: 'approved',
      planId: 'plan-pro',
      userId: 'u1',
      email: 'm@x.com',
      displayName: 'Mentor',
      isUpgrade: false,
    });
    expect(result.ok).toBe(true);
    expect(seen).toMatchObject({ paymentId: 'pay_9', planId: 'plan-pro', status: 'approved', userId: 'u1' });
  });

  it('payment con pageId → enrollment con (paymentId, externalReference, status)', async () => {
    const repo = fakeRepo();
    let seen: unknown = null;
    const ext = JSON.stringify({ pageId: 'page1' });
    const result = await handleGatewayEvent(repo, fakePorts(), {
      enrollment: {
        completeEnrollment: async (input) => {
          seen = input;
          return { success: true, enrollmentId: 'e1' };
        },
      },
    }, {
      provider: 'mercadopago',
      eventType: 'payment',
      paymentId: 'pay_5',
      status: 'approved',
      externalReference: ext,
      pageId: 'page1',
    });
    expect(result.ok).toBe(true);
    expect(seen).toEqual({ paymentId: 'pay_5', externalReference: ext, status: 'approved' });
  });

  it('payment sin external_reference → received sin inscribir', async () => {
    const repo = fakeRepo();
    let calls = 0;
    const result = await handleGatewayEvent(repo, fakePorts(), {
      enrollment: { completeEnrollment: async () => { calls += 1; return { success: true }; } },
    }, {
      provider: 'mercadopago',
      eventType: 'payment',
      paymentId: 'pay_2',
      status: 'approved',
    });
    expect(result.ok).toBe(true);
    expect(calls).toBe(0);
  });
});

describe('handleGatewayEvent — getnet (pending_orders)', () => {
  function orderStore(order: Record<string, unknown> | null) {
    const calls: string[] = [];
    return {
      calls,
      store: {
        findById: async () => (order ? { id: 'ord_1', ...order } : null),
        markCompleted: async () => {
          calls.push('completed');
        },
        markFailed: async () => {
          calls.push('failed');
        },
      },
    };
  }

  it('APPROVED → enrollment + markCompleted (mismo externalReference del webhook)', async () => {
    const repo = fakeRepo();
    const { calls, store } = orderStore({
      status: 'pending',
      landingId: 'page1',
      buyerEmail: 'alu@x.com',
      buyerName: 'Alu',
      tutorId: 'mentor1',
      referidoId: null,
    });
    let seen: unknown = null;
    const result = await handleGatewayEvent(repo, fakePorts(), {
      enrollment: {
        completeEnrollment: async (input) => {
          seen = input;
          return { success: true, enrollmentId: 'e1' };
        },
      },
      pendingOrders: store,
    }, {
      provider: 'getnet',
      eventType: 'APPROVED',
      orderId: 'ord_1',
      paymentId: 'pay_gn_1',
      status: 'APPROVED',
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual(['completed']);
    expect(seen).toMatchObject({ paymentId: 'pay_gn_1', status: 'approved' });
    expect(JSON.parse((seen as { externalReference: string }).externalReference)).toMatchObject({
      pageId: 'page1',
      mentorId: 'mentor1',
    });
  });

  it('status no aprobado → markFailed sin inscribir', async () => {
    const repo = fakeRepo();
    const { calls, store } = orderStore({ status: 'pending' });
    let enrollCalls = 0;
    const result = await handleGatewayEvent(repo, fakePorts(), {
      enrollment: { completeEnrollment: async () => { enrollCalls += 1; return { success: true }; } },
      pendingOrders: store,
    }, {
      provider: 'getnet',
      eventType: 'REJECTED',
      orderId: 'ord_1',
      status: 'REJECTED',
      payload: { status: 'REJECTED' },
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual(['failed']);
    expect(enrollCalls).toBe(0);
  });

  it('sin orderId → VALIDATION `Order ID no encontrado en payload`', async () => {
    const result = await handleGatewayEvent(fakeRepo(), fakePorts(), {}, {
      provider: 'getnet',
      eventType: 'APPROVED',
      status: 'APPROVED',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toBe('Order ID no encontrado en payload');
    }
  });

  it('orden inexistente → NOT_FOUND `Orden no encontrada`', async () => {
    const { store } = orderStore(null);
    const result = await handleGatewayEvent(fakeRepo(), fakePorts(), { pendingOrders: store }, {
      provider: 'getnet',
      eventType: 'APPROVED',
      orderId: 'ord_x',
      status: 'APPROVED',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Orden no encontrada');
    }
  });
});

describe('handleGatewayEvent — validación', () => {
  it('provider desconocido → VALIDATION', async () => {
    const result = await handleGatewayEvent(fakeRepo(), fakePorts(), {}, {
      provider: 'paypal',
      eventType: 'x',
    });
    expect(result.ok).toBe(false);
  });
});
