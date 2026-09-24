/**
 * F0.1 (TDD rojo) — `processTrialEndingReminder`: misma semántica que el
 * engine legacy (ventana `daysLeft <= trialReminderDays && > 0`, defaults
 * `trialReminderDays ?? 5`, email solo dentro de la ventana).
 */
import { describe, expect, it, vi } from 'vitest';

import { processTrialEndingReminder } from '../process-billing-cycle';
import type {
  PlanSnapshot,
  SubscriptionRepository,
  UserBillingSnapshot,
} from '../../subscription-repository';
import type { SubscriptionNotifier, SubscriptionPorts } from '../../subscription-ports';

function stubRepo(plan: PlanSnapshot | null, tutor: UserBillingSnapshot | null) {
  const getPlanCalls: string[] = [];
  const repo: SubscriptionRepository & { getPlanCalls: string[] } = {
    getPlanCalls,
    getPlan: async (planId: string) => {
      getPlanCalls.push(planId);
      return plan;
    },
    getUserSubscription: async () => tutor,
    updateSubscriptionFields: async () => undefined,
    listPageIdsByStatus: async () => [],
    suspendPages: async () => 0,
    reactivatePages: async () => 0,
    writeInvoice: async () => undefined,
  };
  return repo;
}

function stubPorts(): SubscriptionPorts & { sent: unknown[] } {
  const sent: unknown[] = [];
  const notifier: SubscriptionNotifier = {
    sendTrialEnding: vi.fn(async (n: unknown) => {
      sent.push(['trialEnding', n]);
    }),
    sendSubscriptionActivated: vi.fn(async () => undefined),
    sendPaymentFailed: vi.fn(async () => undefined),
    sendAccountSuspended: vi.fn(async () => undefined),
  };
  return {
    sent,
    notifier,
    billing: { cancelExternalSubscription: vi.fn(async () => undefined) },
  };
}

const NOW = new Date('2026-09-14T12:00:00Z');
const plan: PlanSnapshot = { id: 'plan-pro', name: 'Pro', trialReminderDays: 5 };

function tutorWithTrialEndsAt(trialEndsAt: Date): UserBillingSnapshot {
  return {
    uid: 't1',
    email: 'tutor@fastoria.com',
    displayName: 'Tutora',
    subscription: { planId: 'plan-pro', planName: 'Pro', trialEndsAt },
  };
}

describe('processTrialEndingReminder', () => {
  it('sin trialEndsAt → no recuerda y no lee el plan (legacy retorna antes)', async () => {
    const repo = stubRepo(plan, {
      uid: 't1',
      email: 't@f.com',
      displayName: 'T',
      subscription: { planId: 'plan-pro' },
    });
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reminded).toBe(false);
    expect(ports.sent).toHaveLength(0);
    expect(repo.getPlanCalls).toHaveLength(0);
  });

  it('3 días restantes (ventana 5) → envía email con args legacy exactos', async () => {
    const repo = stubRepo(plan, tutorWithTrialEndsAt(new Date('2026-09-17T12:00:00Z')));
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ reminded: true, daysLeft: 3 });
    expect(ports.sent).toEqual([
      ['trialEnding', { email: 'tutor@fastoria.com', name: 'Tutora', daysLeft: 3, planName: 'Pro' }],
    ]);
  });

  it('10 días restantes → no envía', async () => {
    const repo = stubRepo(plan, tutorWithTrialEndsAt(new Date('2026-09-24T12:00:00Z')));
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ reminded: false, daysLeft: 10 });
    expect(ports.sent).toHaveLength(0);
  });

  it('trial ya vencido (daysLeft <= 0) → no envía', async () => {
    const repo = stubRepo(plan, tutorWithTrialEndsAt(new Date('2026-09-10T12:00:00Z')));
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reminded).toBe(false);
    expect(ports.sent).toHaveLength(0);
  });

  it('borde daysLeft == trialReminderDays → envía (legacy `<=`)', async () => {
    const repo = stubRepo(plan, tutorWithTrialEndsAt(new Date('2026-09-19T12:00:00Z')));
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ reminded: true, daysLeft: 5 });
    expect(ports.sent).toHaveLength(1);
  });

  it('sin plan (doc faltante) → default trialReminderDays 5', async () => {
    const repo = stubRepo(null, tutorWithTrialEndsAt(new Date('2026-09-17T12:00:00Z')));
    const ports = stubPorts();
    const result = await processTrialEndingReminder(repo, ports, { tutorId: 't1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reminded).toBe(true);
  });
});
