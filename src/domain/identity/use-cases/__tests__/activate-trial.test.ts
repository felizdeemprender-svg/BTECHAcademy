/**
 * F0.1 (TDD rojo) — `activateTrial`: misma semántica que
 * `subscription-engine.activateTrial` (colección `users`, dot-notation
 * `subscription.*`, defaults `trialDays ?? 90`, status trialing/active).
 */
import { describe, expect, it, vi } from 'vitest';

import { activateTrial } from '../activate-trial';
import type {
  PlanSnapshot,
  SubscriptionRepository,
  UserBillingSnapshot,
} from '../../subscription-repository';

function stubRepo(plan: PlanSnapshot | null): SubscriptionRepository & {
  patches: { uid: string; patch: Record<string, unknown> }[];
} {
  const patches: { uid: string; patch: Record<string, unknown> }[] = [];
  const repo = {
    patches,
    getPlan: vi.fn(async () => plan),
    getUserSubscription: vi.fn(async (): Promise<UserBillingSnapshot | null> => null),
    updateSubscriptionFields: vi.fn(async (uid: string, patch: Record<string, unknown>) => {
      patches.push({ uid, patch });
    }),
    listPageIdsByStatus: vi.fn(async (): Promise<string[]> => []),
    suspendPages: vi.fn(async (): Promise<number> => 0),
    reactivatePages: vi.fn(async (): Promise<number> => 0),
    writeInvoice: vi.fn(async (): Promise<void> => undefined),
  };
  return repo;
}

const basePlan: PlanSnapshot = {
  id: 'plan-pro',
  name: 'Pro',
  trialDays: 14,
  limits: { maxCourses: 10 },
  permissions: ['publish'],
  invitationsPerCourse: 5,
  aiQuotas: { totalCredits: 100 },
  hasPremiumAI: true,
};

describe('activateTrial', () => {
  it('input inválido → VALIDATION', async () => {
    const result = await activateTrial(stubRepo(basePlan), { tutorId: '', planId: 'plan-pro' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });

  it('plan inexistente → NOT_FOUND con el mensaje legacy', async () => {
    const result = await activateTrial(stubRepo(null), { tutorId: 't1', planId: 'no-existe' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Plan no-existe no encontrado');
    }
  });

  it('escribe el patch legacy exacto y retorna trialDays/trialEndsAt', async () => {
    const repo = stubRepo(basePlan);
    const now = new Date('2026-09-14T12:00:00Z');
    const result = await activateTrial(repo, { tutorId: 't1', planId: 'plan-pro', now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.trialDays).toBe(14);
    expect(result.value.trialEndsAt).toEqual(new Date('2026-09-28T12:00:00Z'));

    expect(repo.patches).toHaveLength(1);
    const patch = repo.patches[0]?.patch ?? {};
    expect(repo.patches[0]?.uid).toBe('t1');
    expect(patch['subscription.status']).toBe('trialing');
    expect(patch['subscription.planId']).toBe('plan-pro');
    expect(patch['subscription.planName']).toBe('Pro');
    expect(patch['subscription.trialEndsAt']).toEqual(new Date('2026-09-28T12:00:00Z'));
    expect(patch['subscription.nextBillingAt']).toEqual(patch['subscription.trialEndsAt']);
    expect(patch['subscription.gracePeriodEndsAt']).toBeNull();
    expect(patch['subscription.limits']).toEqual({ maxCourses: 10 });
    expect(patch['subscription.permissions']).toEqual(['publish']);
    expect(patch['subscription.invitationsPerCourse']).toBe(5);
    expect(patch['subscription.aiQuotas']).toEqual({ totalCredits: 100, usedCredits: 0 });
    expect(patch['subscription.hasPremiumAI']).toBe(true);
    expect(patch['subscription.startDate']).toEqual(now);
  });

  it('trialDays 0 → status active (legacy `trialDays > 0 ? trialing : active`)', async () => {
    const repo = stubRepo({ ...basePlan, trialDays: 0 });
    const result = await activateTrial(repo, { tutorId: 't1', planId: 'plan-pro' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.trialDays).toBe(0);
    expect(repo.patches[0]?.patch['subscription.status']).toBe('active');
  });

  it('sin trialDays en el plan → default 90 (legacy `?? 90`)', async () => {
    const { trialDays: _dropped, ...planSinTrial } = basePlan;
    const repo = stubRepo(planSinTrial);
    const result = await activateTrial(repo, {
      tutorId: 't1',
      planId: 'plan-pro',
      now: new Date('2026-09-14T12:00:00Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.trialDays).toBe(90);
    expect(result.value.trialEndsAt).toEqual(new Date('2026-12-13T12:00:00Z'));
    expect(repo.patches[0]?.patch['subscription.status']).toBe('trialing');
  });

  it('sin invitationsPerCourse → default 5 y aiQuotas con usedCredits 0', async () => {
    const { invitationsPerCourse: _i, aiQuotas: _a, hasPremiumAI: _h, ...planMinimo } = basePlan;
    const repo = stubRepo({ ...planMinimo, name: 'Base' });
    const result = await activateTrial(repo, { tutorId: 't1', planId: 'plan-pro' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(repo.patches[0]?.patch['subscription.invitationsPerCourse']).toBe(5);
    expect(repo.patches[0]?.patch['subscription.aiQuotas']).toEqual({ totalCredits: 0, usedCredits: 0 });
    expect(repo.patches[0]?.patch['subscription.hasPremiumAI']).toBe(false);
  });
});
