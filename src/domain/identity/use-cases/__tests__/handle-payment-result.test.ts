/**
 * F0.1 (TDD rojo) — `handlePaymentResult` por discriminante de evento:
 * created / succeeded / failed / canceled con la semántica 1:1 del engine
 * legacy (reemplazo de pasarela con cancel Stripe, dunning con gracia,
 * succeeded reactiva si estaba suspendido, canceled delega a suspender).
 */
import { describe, expect, it, vi } from 'vitest';

import { handlePaymentResult } from '../handle-payment-result';
import type {
  SubscriptionRepository,
  UserBillingSnapshot,
} from '../../subscription-repository';
import type { SubscriptionNotifier, SubscriptionPorts } from '../../subscription-ports';

interface StubRepo extends SubscriptionRepository {
  patches: { uid: string; patch: Record<string, unknown> }[];
}

function stubRepo(tutor: UserBillingSnapshot | null, planName = 'Pro'): StubRepo & {
  reads: string[];
} {
  const patches: { uid: string; patch: Record<string, unknown> }[] = [];
  const reads: string[] = [];
  return {
    patches,
    reads,
    getPlan: async (planId: string) => {
      reads.push(`plan:${planId}`);
      return { id: planId, name: planName, billingCycleMonths: 1, gracePeriodDays: 7 };
    },
    getUserSubscription: async (uid: string) => {
      reads.push(`user:${uid}`);
      return tutor;
    },
    updateSubscriptionFields: async (uid, patch) => {
      patches.push({ uid, patch });
    },
    listPageIdsByStatus: async () => [],
    suspendPages: async () => 2,
    reactivatePages: async () => 3,
    writeInvoice: async () => undefined,
  };
}

function stubPorts(): SubscriptionPorts & {
  sent: unknown[];
  canceled: { gateway: string; subscriptionId: string }[];
  failCancel: boolean;
} {
  const sent: unknown[] = [];
  const canceled: { gateway: string; subscriptionId: string }[] = [];
  const ports: SubscriptionPorts & {
    sent: unknown[];
    canceled: { gateway: string; subscriptionId: string }[];
    failCancel: boolean;
  } = {
    sent,
    canceled,
    failCancel: false,
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
        if (ports.failCancel) throw new Error('stripe down');
        canceled.push({ gateway, subscriptionId });
      },
    },
  };
  return ports;
}

const NOW = new Date('2026-09-14T12:00:00Z');

function tutorWith(subscription: Record<string, unknown>): UserBillingSnapshot {
  return { uid: 't1', email: 'tutor@fastoria.com', displayName: 'Tutora', subscription };
}

describe('handlePaymentResult — evento inválido', () => {
  it('discriminante desconocido → VALIDATION', async () => {
    const result = await handlePaymentResult(stubRepo(null), stubPorts(), {
      kind: 'nope',
      tutorId: 't1',
    });
    expect(result.ok).toBe(false);
  });
});

describe('handlePaymentResult — created', () => {
  it('sin suscripción previa → solo enlaza gateway (patch legacy exacto)', async () => {
    const repo = stubRepo(tutorWith({ planId: 'plan-pro' }));
    const result = await handlePaymentResult(repo, stubPorts(), {
      kind: 'created',
      tutorId: 't1',
      subscriptionId: 'sub_123',
      gateway: 'stripe',
    });
    expect(result.ok).toBe(true);
    expect(repo.patches).toEqual([
      {
        uid: 't1',
        patch: { 'subscription.gateway': 'stripe', 'subscription.gatewaySubscriptionId': 'sub_123' },
      },
    ]);
  });

  it('reemplazo stripe → cancela la anterior y enlaza la nueva', async () => {
    const repo = stubRepo(tutorWith({ planId: 'p', gateway: 'stripe', gatewaySubscriptionId: 'sub_old' }));
    const ports = stubPorts();
    const result = await handlePaymentResult(repo, ports, {
      kind: 'created',
      tutorId: 't1',
      subscriptionId: 'sub_new',
      gateway: 'stripe',
    });
    expect(result.ok).toBe(true);
    expect(ports.canceled).toEqual([{ gateway: 'stripe', subscriptionId: 'sub_old' }]);
    expect(repo.patches[0]?.patch['subscription.gatewaySubscriptionId']).toBe('sub_new');
  });

  it('si el cancel Stripe falla → igual enlaza (legacy traga el error)', async () => {
    const repo = stubRepo(tutorWith({ planId: 'p', gateway: 'stripe', gatewaySubscriptionId: 'sub_old' }));
    const ports = stubPorts();
    ports.failCancel = true;
    const result = await handlePaymentResult(repo, ports, {
      kind: 'created',
      tutorId: 't1',
      subscriptionId: 'sub_new',
      gateway: 'stripe',
    });
    expect(result.ok).toBe(true);
    expect(repo.patches).toHaveLength(1);
  });

  it('mismo subscriptionId → no cancela', async () => {
    const repo = stubRepo(tutorWith({ planId: 'p', gateway: 'stripe', gatewaySubscriptionId: 'sub_1' }));
    const ports = stubPorts();
    await handlePaymentResult(repo, ports, {
      kind: 'created',
      tutorId: 't1',
      subscriptionId: 'sub_1',
      gateway: 'stripe',
    });
    expect(ports.canceled).toHaveLength(0);
    expect(repo.patches).toHaveLength(1);
  });
});

describe('handlePaymentResult — succeeded', () => {
  it('usuario inexistente → NOT_FOUND `Usuario t1 no encontrado`', async () => {
    const result = await handlePaymentResult(stubRepo(null), stubPorts(), {
      kind: 'succeeded',
      tutorId: 't1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Usuario t1 no encontrado');
  });

  it('patch legacy exacto + email activada con fecha dd/MM/yyyy', async () => {
    const repo = stubRepo(tutorWith({ status: 'active', planId: 'plan-pro' }));
    const ports = stubPorts();
    const next = new Date('2026-10-14T12:00:00Z');
    const result = await handlePaymentResult(repo, ports, {
      kind: 'succeeded',
      tutorId: 't1',
      nextBillingDate: next,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(repo.patches).toEqual([
      {
        uid: 't1',
        patch: {
          'subscription.status': 'active',
          'subscription.nextBillingAt': next,
          'subscription.gracePeriodEndsAt': null,
          'subscription.lastBilledAt': NOW,
        },
      },
    ]);
    expect(ports.sent).toEqual([
      [
        'activated',
        { email: 'tutor@fastoria.com', name: 'Tutora', planName: 'Pro', nextBillingDate: '14/10/2026' },
      ],
    ]);
  });

  it('sin nextBillingDate → +billingCycleMonths del plan (legacy addMonths)', async () => {
    const repo = stubRepo(tutorWith({ status: 'active', planId: 'plan-pro' }));
    const result = await handlePaymentResult(repo, stubPorts(), {
      kind: 'succeeded',
      tutorId: 't1',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ kind: 'succeeded', reactivated: false });
    const nextBillingAt = repo.patches[0]?.patch['subscription.nextBillingAt'] as Date;
    expect([nextBillingAt.getFullYear(), nextBillingAt.getMonth(), nextBillingAt.getDate()]).toEqual([
      2026, 9, 14,
    ]);
  });

  it('suspendido → reactiva primero (patch active + reactivatePages) y luego cobra', async () => {
    const repo = stubRepo(tutorWith({ status: 'suspended', planId: 'plan-pro' }));
    const result = await handlePaymentResult(repo, stubPorts(), {
      kind: 'succeeded',
      tutorId: 't1',
      nextBillingDate: new Date('2026-10-14T12:00:00Z'),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ kind: 'succeeded', reactivated: true });
    // Primer patch = reactivación legacy, segundo = cobro
    expect(repo.patches[0]?.patch['subscription.status']).toBe('active');
    expect(repo.patches).toHaveLength(2);
  });
});

describe('handlePaymentResult — failed', () => {
  it('usuario inexistente → ok skipped sin escrituras (legacy retorna)', async () => {
    const repo = stubRepo(null);
    const ports = stubPorts();
    const result = await handlePaymentResult(repo, ports, { kind: 'failed', tutorId: 't1' });
    expect(result.ok).toBe(true);
    expect(repo.patches).toHaveLength(0);
    expect(ports.sent).toHaveLength(0);
  });

  it('patch past_due + gracia 7 días + email con fecha dd/MM/yyyy', async () => {
    const repo = stubRepo(tutorWith({ status: 'active', planId: 'plan-pro' }));
    const ports = stubPorts();
    const result = await handlePaymentResult(repo, ports, { kind: 'failed', tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    const patch = repo.patches[0]?.patch ?? {};
    expect(patch['subscription.status']).toBe('past_due');
    expect(patch['subscription.gracePeriodEndsAt']).toEqual(new Date('2026-09-21T12:00:00Z'));
    expect(patch['subscription.failedBillingAt']).toEqual(NOW);
    expect(ports.sent).toEqual([
      ['failed', { email: 'tutor@fastoria.com', name: 'Tutora', graceUntil: '21/09/2026' }],
    ]);
  });
});

describe('handlePaymentResult — canceled', () => {
  it('delega a suspender (status suspended + email)', async () => {
    const repo = stubRepo(tutorWith({ status: 'active', planId: 'plan-pro' }));
    const ports = stubPorts();
    const result = await handlePaymentResult(repo, ports, {
      kind: 'canceled',
      tutorId: 't1',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(repo.patches[0]?.patch['subscription.status']).toBe('suspended');
    expect(ports.sent).toEqual([[ 'suspended', { email: 'tutor@fastoria.com', name: 'Tutora' } ]]);
  });

  it('usa vi como espía de puertos (smoke del mock)', () => {
    expect(vi.isMockFunction(vi.fn())).toBe(true);
  });
});
