/**
 * F0.1 (TDD rojo) — `suspendTutor` / `reactivateTutor`: misma semántica que el
 * engine legacy (patch `subscription.status`, filtros de `salesPages`,
 * email solo al suspender, reactivate sin leer el usuario ni enviar email).
 */
import { describe, expect, it, vi } from 'vitest';

import { reactivateTutor, suspendTutor } from '../suspend-reactivate-tutor';
import type {
  SubscriptionRepository,
  UserBillingSnapshot,
} from '../../subscription-repository';
import type { SubscriptionNotifier, SubscriptionPorts } from '../../subscription-ports';

interface StubRepo extends SubscriptionRepository {
  patches: { uid: string; patch: Record<string, unknown> }[];
  suspended: string[];
  reactivated: string[];
}

function stubRepo(tutor: UserBillingSnapshot | null): StubRepo {
  const patches: { uid: string; patch: Record<string, unknown> }[] = [];
  const suspended: string[] = [];
  const reactivated: string[] = [];
  return {
    patches,
    suspended,
    reactivated,
    getPlan: async () => null,
    getUserSubscription: async () => tutor,
    updateSubscriptionFields: async (uid, patch) => {
      patches.push({ uid, patch });
    },
    listPageIdsByStatus: async () => [],
    suspendPages: async (mentorId) => {
      suspended.push(mentorId);
      return 2;
    },
    reactivatePages: async (mentorId) => {
      reactivated.push(mentorId);
      return 2;
    },
    writeInvoice: async () => undefined,
  };
}

function stubPorts(): SubscriptionPorts & { sent: unknown[] } {
  const sent: unknown[] = [];
  const notifier: SubscriptionNotifier = {
    sendTrialEnding: async () => undefined,
    sendSubscriptionActivated: async () => undefined,
    sendPaymentFailed: async () => undefined,
    sendAccountSuspended: async (n: unknown) => {
      sent.push(['suspended', n]);
    },
  };
  return {
    sent,
    notifier,
    billing: { cancelExternalSubscription: async () => undefined },
  };
}

const tutor: UserBillingSnapshot = {
  uid: 't1',
  email: 'tutor@fastoria.com',
  displayName: 'Tutora',
  subscription: { status: 'past_due', planId: 'plan-pro' },
};

describe('suspendTutor', () => {
  it('usuario inexistente → skipped sin escrituras ni email (legacy retorna)', async () => {
    const repo = stubRepo(null);
    const ports = stubPorts();
    const result = await suspendTutor(repo, ports, { tutorId: 'fantasma' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ skipped: true, suspendedPages: 0 });
    expect(repo.patches).toHaveLength(0);
    expect(repo.suspended).toHaveLength(0);
    expect(ports.sent).toHaveLength(0);
  });

  it('patch legacy exacto + suspendPages + email de suspensión', async () => {
    const repo = stubRepo(tutor);
    const ports = stubPorts();
    const now = new Date('2026-09-14T12:00:00Z');
    const result = await suspendTutor(repo, ports, { tutorId: 't1', now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ skipped: false, suspendedPages: 2 });
    expect(repo.patches).toEqual([
      {
        uid: 't1',
        patch: { 'subscription.status': 'suspended', 'subscription.suspendedAt': now },
      },
    ]);
    expect(repo.suspended).toEqual(['t1']);
    expect(ports.sent).toEqual([['suspended', { email: 'tutor@fastoria.com', name: 'Tutora' }]]);
  });

  it('input inválido → VALIDATION', async () => {
    const result = await suspendTutor(stubRepo(tutor), stubPorts(), { tutorId: '' });
    expect(result.ok).toBe(false);
  });
});

describe('reactivateTutor', () => {
  it('patch legacy exacto + reactivatePages, sin email (igual que el legacy)', async () => {
    const repo = stubRepo(tutor);
    const ports = stubPorts();
    const result = await reactivateTutor(repo, { tutorId: 't1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ reactivatedPages: 2 });
    expect(repo.patches).toEqual([
      {
        uid: 't1',
        patch: {
          'subscription.status': 'active',
          'subscription.gracePeriodEndsAt': null,
          'subscription.suspendedAt': null,
        },
      },
    ]);
    expect(repo.reactivated).toEqual(['t1']);
    expect(ports.sent).toHaveLength(0);
  });

  it('input inválido → VALIDATION', async () => {
    const result = await reactivateTutor(stubRepo(tutor), { tutorId: '' });
    expect(result.ok).toBe(false);
  });
});
