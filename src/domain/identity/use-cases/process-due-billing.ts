/**
 * Identidad — Caso de uso: cron de facturación vencida (F0.3).
 * Lógica 1:1 con `GET api/cron/process-billing` legacy: usuarios con
 * `subscription.status in [active, trial]`, omite sin ciclo o con ciclo
 * futuro, descuento por `promotions.periods` del plan, regalías para
 * `type === 'mixed'` con `pricing.revenueShare` (alumnos únicos activos
 * y tiers), cobro vía puerto (Stripe en prod), factura en la
 * subcolección `invoices` con el mismo shape, `past_due` + gracia de 7
 * días al fallar, y renovación del ciclo con `billingCycleMonths`.
 * Dominio puro: storage por `BillingCronSource`, cobro por `MonthlyCharge`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';

import type { SubscriptionRepository } from '../subscription-repository';

/** Usuario facturable (misma lectura que el cron legacy). */
export interface CronBillableUser {
  readonly id: string;
  readonly subscription: Record<string, unknown>;
  readonly cycleStartRaw: unknown;
  readonly cycleEndRaw: unknown;
  readonly cycleEnd: Date | null;
  readonly promotionalCycleIndex: number;
  readonly monthlySalesAmount: number;
  readonly stripeCustomerId: string | null;
}

/** Fuente del cron: reusa `SubscriptionRepository` + dos lecturas nuevas. */
export interface BillingCronSource extends Pick<
  SubscriptionRepository,
  'getPlan' | 'writeInvoice' | 'updateSubscriptionFields'
> {
  /** `users` con `subscription.status in [active, trial]` (igual que el cron). */
  listBillableUsers(): Promise<CronBillableUser[]>;
  /** `studentId` de `enrollments` con `mentorId ==` + `status == active`. */
  listActiveStudentIds(mentorId: string): Promise<string[]>;
}

/** Puerto de cobro mensual (Stripe en prod, fake en tests). */
export interface MonthlyCharge {
  chargeMonthlyBill(input: {
    readonly customerId: string;
    readonly amount: number;
    readonly currency: string;
    readonly description: string;
  }): Promise<{ readonly success: boolean; readonly error?: string }>;
}

export const DueBillingInputSchema = z.object({
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type DueBillingInput = z.infer<typeof DueBillingInputSchema>;

export type BillingCronResultItem =
  | { readonly userId: string; readonly success: true; readonly charged: number }
  | { readonly userId: string; readonly success: false; readonly reason: string };

export interface DueBillingResult {
  readonly processed: number;
  readonly results: BillingCronResultItem[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function runDueBilling(
  source: BillingCronSource,
  charge: MonthlyCharge,
  rawInput: unknown,
): Promise<Result<DueBillingResult, DomainError>> {
  const parsed = DueBillingInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return err(validationError('Parámetros de facturación inválidos', parsed.error.flatten()));
  }
  const now = parsed.data.now ?? new Date();
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);

  const users = await source.listBillableUsers();
  const results: BillingCronResultItem[] = [];

  for (const billable of users) {
    const sub = billable.subscription;
    const cycleEnd = billable.cycleEnd;
    if (!cycleEnd) continue;
    if (cycleEnd > today) continue;

    const fixedAmount = (sub.fixedAmount as number) || 0;
    let discountPercent = 0;
    const promoIndex = billable.promotionalCycleIndex || 0;

    const plan = await source.getPlan(sub.planId as string);
    const planData = (plan ?? {}) as unknown as Record<string, unknown>;
    const promotions = planData.promotions as
      | { periods?: { cycleCount: number; discountPercent: number }[] }
      | undefined;
    if (plan && promotions && promotions.periods) {
      let elapsed = 0;
      for (const period of promotions.periods) {
        if (promoIndex >= elapsed && promoIndex < elapsed + period.cycleCount) {
          discountPercent = period.discountPercent;
          break;
        }
        elapsed += period.cycleCount;
      }
    }

    const discountedFixedAmount = fixedAmount * (1 - discountPercent / 100);

    let royaltiesAmount = 0;
    const sales = billable.monthlySalesAmount || 0;
    let activeStudentsCount = 0;

    const pricing = planData.pricing as
      | { billingCycleMonths?: number; revenueShare?: { freeStudentsIncluded?: number; tiers?: { min: number; max: number; percentage: number }[] } }
      | undefined;
    if (sub.type === 'mixed' && pricing?.revenueShare) {
      const studentIds = await source.listActiveStudentIds(billable.id);
      activeStudentsCount = new Set(studentIds).size;
      const { freeStudentsIncluded = 0, tiers = [] } = pricing.revenueShare;
      const studentsForTier = Math.max(0, activeStudentsCount - freeStudentsIncluded);
      const matchingTier = tiers.find(
        (t) => studentsForTier >= t.min && (t.max === -1 || t.max === 0 || studentsForTier <= t.max),
      );
      if (matchingTier) {
        royaltiesAmount = sales * (matchingTier.percentage / 100);
      }
    }

    const totalToCharge = discountedFixedAmount + royaltiesAmount;
    const cycleId = cycleEnd.toISOString().split('T')[0] as string;

    const baseInvoice = {
      cycleStart: billable.cycleStartRaw,
      cycleEnd: billable.cycleEndRaw,
      planId: sub.planId,
      planName: (sub.planName as string | undefined) || (planData.name as string | undefined) || 'Plan',
      fixedAmount,
      discountPercent,
      discountedFixedAmount,
      salesAmount: sales,
      activeStudentsCount,
      royaltiesAmount,
      totalCharged: totalToCharge,
      createdAt: now,
    };

    const failWithInvoice = async (reason: string): Promise<void> => {
      results.push({ userId: billable.id, success: false, reason });
      await source.writeInvoice(billable.id, cycleId, {
        ...baseInvoice,
        status: 'failed',
        failureReason: reason,
      });
      await source.updateSubscriptionFields(billable.id, {
        'subscription.status': 'past_due',
        'subscription.gracePeriodEndsAt': new Date(now.getTime() + SEVEN_DAYS_MS),
      });
    };

    if (totalToCharge > 0) {
      const stripeCustomerId = billable.stripeCustomerId;
      if (!stripeCustomerId) {
        await failWithInvoice('No Stripe Customer ID');
        continue;
      }
      const chargeResult = await charge.chargeMonthlyBill({
        customerId: stripeCustomerId,
        amount: totalToCharge,
        currency: 'usd',
        description: 'Facturación mensual - Abono + Regalías',
      });
      if (!chargeResult.success) {
        await failWithInvoice(chargeResult.error as string);
        continue;
      }
    }

    await source.writeInvoice(billable.id, cycleId, {
      ...baseInvoice,
      status: 'paid',
      failureReason: null,
    });

    const nextCycleEnd = new Date(cycleEnd.getTime());
    const monthsToAdd = pricing?.billingCycleMonths || 1;
    nextCycleEnd.setMonth(nextCycleEnd.getMonth() + monthsToAdd);

    await source.updateSubscriptionFields(billable.id, {
      'billingCycle.currentCycleStart': cycleEnd,
      'billingCycle.currentCycleEnd': nextCycleEnd,
      'billingCycle.promotionalCycleIndex': promoIndex + 1,
      'billingCycle.monthlySalesAmount': 0,
    });

    results.push({ userId: billable.id, success: true, charged: totalToCharge });
  }

  return ok({ processed: results.length, results });
}
