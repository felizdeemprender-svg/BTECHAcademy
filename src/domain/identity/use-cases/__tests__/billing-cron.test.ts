/**
 * F0.3 (TDD rojo) — `runDueBilling`: misma semántica que
 * `GET api/cron/process-billing` legacy (vencidos, promos, regalías por
 * tiers, cobro Stripe, facturas en subcolección `invoices`, past_due con
 * gracia de 7 días, renovación del ciclo).
 */
import { describe, expect, it } from 'vitest';

import {
  runDueBilling,
  type BillingCronSource,
  type CronBillableUser,
  type MonthlyCharge,
} from '../process-due-billing';

const NOW = new Date('2026-09-14T12:00:00Z');
const CYCLE_END = new Date('2026-09-10T00:00:00Z');

function user(partial: Partial<CronBillableUser> & { id: string }): CronBillableUser {
  return {
    subscription: {},
    cycleStartRaw: new Date('2026-08-10T00:00:00Z'),
    cycleEndRaw: CYCLE_END,
    cycleEnd: CYCLE_END,
    promotionalCycleIndex: 0,
    monthlySalesAmount: 0,
    stripeCustomerId: null,
    ...partial,
  };
}

interface ChargeCall {
  customerId: string;
  amount: number;
  currency: string;
  description: string;
}

function stubWorld(users: CronBillableUser[], plans: Record<string, Record<string, unknown>>, chargeImpl?: (amount: number) => { success: boolean; error?: string }) {
  const invoices: { uid: string; cycleId: string; data: Record<string, unknown> }[] = [];
  const updates: { uid: string; patch: Record<string, unknown> }[] = [];
  const charges: ChargeCall[] = [];
  const studentsByMentor: Record<string, string[]> = {
    u6: ['s1', 's2', 's1'],
  };
  const source: BillingCronSource = {
    getPlan: async (planId) => {
      const raw = plans[planId];
      if (!raw) return null;
      return { id: planId, ...raw };
    },
    writeInvoice: async (uid, cycleId, data) => {
      invoices.push({ uid, cycleId, data });
    },
    updateSubscriptionFields: async (uid, patch) => {
      updates.push({ uid, patch });
    },
    listBillableUsers: async () => users,
    listActiveStudentIds: async (mentorId) => studentsByMentor[mentorId] ?? [],
  };
  const charge: MonthlyCharge = {
    chargeMonthlyBill: async (input) => {
      charges.push(input);
      if (chargeImpl) {
        const r = chargeImpl(input.amount);
        return r.success ? { success: true } : { success: false, error: r.error };
      }
      return { success: true };
    },
  };
  return { source, charge, invoices, updates, charges };
}

const promoPlan = {
  name: 'Pro',
  promotions: { periods: [{ cycleCount: 2, discountPercent: 50 }] },
  pricing: { billingCycleMonths: 1 },
};

describe('runDueBilling', () => {
  it('cobra con descuento promo, factura paid y renueva el ciclo', async () => {
    const { source, charge, invoices, updates, charges } = stubWorld(
      [user({ id: 'u1', subscription: { planId: 'pro', planName: 'Pro', fixedAmount: 100, type: 'fixed' }, stripeCustomerId: 'cus_1' })],
      { pro: promoPlan },
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ processed: 1, results: [{ userId: 'u1', success: true, charged: 50 }] });
    expect(charges).toEqual([
      { customerId: 'cus_1', amount: 50, currency: 'usd', description: 'Facturación mensual - Abono + Regalías' },
    ]);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ uid: 'u1', cycleId: '2026-09-10', data: { status: 'paid', totalCharged: 50, discountPercent: 50 } });
    const renewal = updates.find((u) => u.uid === 'u1')!;
    expect(renewal.patch['billingCycle.promotionalCycleIndex']).toBe(1);
    expect(renewal.patch['billingCycle.monthlySalesAmount']).toBe(0);
    expect((renewal.patch['billingCycle.currentCycleEnd'] as Date).toISOString()).toBe(
      new Date('2026-10-10T00:00:00Z').toISOString(),
    );
  });

  it('omite sin ciclo y con ciclo futuro', async () => {
    const { source, charge } = stubWorld(
      [
        user({ id: 'u2', subscription: { planId: 'pro', fixedAmount: 10 }, cycleEnd: null, cycleEndRaw: null }),
        user({ id: 'u3', subscription: { planId: 'pro', fixedAmount: 10 }, cycleEnd: new Date('2026-10-01T00:00:00Z'), cycleEndRaw: new Date('2026-10-01T00:00:00Z'), stripeCustomerId: 'cus_3' }),
      ],
      { pro: promoPlan },
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ processed: 0, results: [] });
  });

  it('sin customer → factura failed + past_due con gracia de 7 días', async () => {
    const { source, charge, invoices, updates } = stubWorld(
      [user({ id: 'u4', subscription: { planId: 'pro', fixedAmount: 100, type: 'fixed' } })],
      { pro: promoPlan },
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([{ userId: 'u4', success: false, reason: 'No Stripe Customer ID' }]);
    expect(invoices[0]?.data.status).toBe('failed');
    const pastDue = updates.find((u) => u.uid === 'u4')!;
    expect(pastDue.patch['subscription.status']).toBe('past_due');
    expect((pastDue.patch['subscription.gracePeriodEndsAt'] as Date).toISOString()).toBe(
      new Date('2026-09-21T12:00:00Z').toISOString(),
    );
  });

  it('cobro rechazado → failed con el motivo del cargo', async () => {
    const { source, charge } = stubWorld(
      [user({ id: 'u5', subscription: { planId: 'pro', fixedAmount: 100 }, stripeCustomerId: 'cus_5' })],
      { pro: promoPlan },
      () => ({ success: false, error: 'card_declined' }),
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([{ userId: 'u5', success: false, reason: 'card_declined' }]);
  });

  it('mixto con revenueShare → regalías por tier sobre alumnos únicos', async () => {
    const { source, charge, invoices } = stubWorld(
      [
        user({
          id: 'u6',
          subscription: { planId: 'mix', fixedAmount: 0, type: 'mixed' },
          monthlySalesAmount: 500,
          stripeCustomerId: 'cus_6',
        }),
      ],
      {
        mix: {
          name: 'Mix',
          pricing: {
            billingCycleMonths: 1,
            revenueShare: { freeStudentsIncluded: 1, tiers: [{ min: 0, max: 10, percentage: 20 }] },
          },
        },
      },
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 2 únicos − 1 gratis = 1 → tier 0..10 al 20% de 500 = 100
    expect(result.value.results).toEqual([{ userId: 'u6', success: true, charged: 100 }]);
    expect(invoices[0]?.data).toMatchObject({ royaltiesAmount: 100, activeStudentsCount: 2 });
  });

  it('total 0 → paid sin cobrar y renueva', async () => {
    const { source, charge, invoices } = stubWorld(
      [user({ id: 'u7', subscription: { planId: 'pro', fixedAmount: 0 }, stripeCustomerId: 'cus_7' })],
      { pro: { name: 'Pro', pricing: { billingCycleMonths: 1 } } },
    );
    const result = await runDueBilling(source, charge, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toEqual([{ userId: 'u7', success: true, charged: 0 }]);
    expect(invoices[0]?.data.status).toBe('paid');
  });
});
