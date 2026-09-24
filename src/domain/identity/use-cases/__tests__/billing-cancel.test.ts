/**
 * F0.3 (TDD rojo) — `cancelSubscription`: misma semántica que
 * `POST api/subscriptions/cancel` legacy (404 sin suscripción, cancel
 * local sin gatewaySubscriptionId, Stripe tolerante a fallos, GetNet
 * no-op con log, patch `subscription.status=canceled` + `canceledAt`).
 */
import { describe, expect, it, vi } from 'vitest';

import { cancelSubscription } from '../cancel-subscription';
import type {
  SubscriptionRepository,
  UserBillingSnapshot,
} from '../../subscription-repository';
import type { ExternalBillingGateway } from '../../subscription-ports';

const NOW = new Date('2026-09-14T12:00:00Z');

function stubRepo(tutor: UserBillingSnapshot | null) {
  const patches: { uid: string; patch: Record<string, unknown> }[] = [];
  const repo: SubscriptionRepository = {
    getPlan: async () => null,
    getUserSubscription: async () => tutor,
    updateSubscriptionFields: async (uid, patch) => {
      patches.push({ uid, patch });
    },
    listPageIdsByStatus: async () => [],
    suspendPages: async () => 0,
    reactivatePages: async () => 0,
    writeInvoice: async () => undefined,
  };
  return { repo, patches };
}

function stubBilling() {
  const calls: { gateway: string; subscriptionId: string }[] = [];
  const failures: Error[] = [];
  const billing: ExternalBillingGateway = {
    cancelExternalSubscription: async (gateway, subscriptionId) => {
      calls.push({ gateway, subscriptionId });
      const failure = failures.shift();
      if (failure) throw failure;
    },
  };
  return { billing, calls, failures };
}

describe('cancelSubscription', () => {
  it('input inválido → VALIDATION', async () => {
    const { repo } = stubRepo(null);
    const { billing } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, {});
    expect(result.ok).toBe(false);
  });

  it('usuario inexistente → NOT_FOUND con mensaje legacy', async () => {
    const { repo, patches } = stubRepo(null);
    const { billing } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 'fantasma', now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Suscripción no encontrada');
    expect(patches).toHaveLength(0);
  });

  it('usuario sin suscripción (objeto vacío del repo) → NOT_FOUND legacy', async () => {
    const { repo } = stubRepo({ uid: 't1', email: 'a@x.com', displayName: 'A', subscription: {} });
    const { billing } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('sin gatewaySubscriptionId → cancel local, sin llamar a la pasarela', async () => {
    const { repo, patches } = stubRepo({
      uid: 't1',
      email: 'a@x.com',
      displayName: 'A',
      subscription: { status: 'active', gateway: 'stripe' },
    });
    const { billing, calls } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ localOnly: true });
    expect(calls).toHaveLength(0);
    expect(patches).toEqual([
      { uid: 't1', patch: { 'subscription.status': 'canceled', 'subscription.canceledAt': NOW } },
    ]);
  });

  it('stripe con id → cancela externo y marca canceled', async () => {
    const { repo, patches } = stubRepo({
      uid: 't1',
      email: 'a@x.com',
      displayName: 'A',
      subscription: { status: 'active', gateway: 'stripe', gatewaySubscriptionId: 'sub_9' },
    });
    const { billing, calls } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ localOnly: false });
    expect(calls).toEqual([{ gateway: 'stripe', subscriptionId: 'sub_9' }]);
    expect(patches[0]?.patch['subscription.status']).toBe('canceled');
  });

  it('fallo en Stripe → tolerante: igual marca canceled (legacy loguea y sigue)', async () => {
    const { repo, patches } = stubRepo({
      uid: 't1',
      email: 'a@x.com',
      displayName: 'A',
      subscription: { status: 'active', gateway: 'stripe', gatewaySubscriptionId: 'sub_9' },
    });
    const { billing } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    expect(patches).toHaveLength(1);
    expect(patches[0]?.patch['subscription.status']).toBe('canceled');
  });

  it('stripe que falla no propaga el error (usa puerto que rechaza)', async () => {
    const { repo, patches } = stubRepo({
      uid: 't1',
      email: 'a@x.com',
      displayName: 'A',
      subscription: { status: 'active', gateway: 'stripe', gatewaySubscriptionId: 'sub_x' },
    });
    const failing: ExternalBillingGateway = {
      cancelExternalSubscription: async () => {
        throw new Error('card declined');
      },
    };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await cancelSubscription(repo, { billing: failing }, { tutorId: 't1', now: NOW });
      expect(result.ok).toBe(true);
      expect(patches).toHaveLength(1);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it('getnet → no llama a pasarela externa, solo marca canceled', async () => {
    const { repo, patches } = stubRepo({
      uid: 't1',
      email: 'a@x.com',
      displayName: 'A',
      subscription: { status: 'active', gateway: 'getnet', gatewaySubscriptionId: 'g_1' },
    });
    const { billing, calls } = stubBilling();
    const result = await cancelSubscription(repo, { billing }, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ localOnly: false });
    expect(calls).toHaveLength(0);
    expect(patches).toHaveLength(1);
  });
});
