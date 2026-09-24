/**
 * Identidad — Caso de uso: activar período de prueba (F0.1).
 * Lógica 1:1 con `subscription-engine.activateTrial`: lee
 * `subscriptionPlans` doc(planId), `trialDays ?? 90`, status
 * `trialing`/`active`, y escribe el patch `subscription.*` idéntico.
 * Sin efectos laterales (el legacy tampoco envía emails aquí).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';
import { addDays } from '@/domain/shared/dates';

import type { SubscriptionRepository } from '../subscription-repository';

export const ActivateTrialInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
  planId: z.string().min(1, 'planId vacío'),
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type ActivateTrialInput = z.infer<typeof ActivateTrialInputSchema>;

export interface ActivateTrialResult {
  readonly trialDays: number;
  readonly trialEndsAt: Date;
}

export async function activateTrial(
  repo: SubscriptionRepository,
  rawInput: unknown,
): Promise<Result<ActivateTrialResult, DomainError>> {
  const parsed = ActivateTrialInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de activación inválidos', parsed.error.flatten()));
  }
  const { tutorId, planId } = parsed.data;
  const now = parsed.data.now ?? new Date();

  const plan = await repo.getPlan(planId);
  if (!plan) {
    return err(notFound(`Plan ${planId} no encontrado`));
  }

  const trialDays = (plan.trialDays ?? 90) as number;
  const trialEndsAt = addDays(now, trialDays);

  await repo.updateSubscriptionFields(tutorId, {
    'subscription.status': trialDays > 0 ? 'trialing' : 'active',
    'subscription.planId': planId,
    'subscription.planName': plan.name,
    'subscription.trialEndsAt': trialEndsAt,
    'subscription.nextBillingAt': trialEndsAt,
    'subscription.gracePeriodEndsAt': null,
    'subscription.limits': plan.limits,
    'subscription.permissions': plan.permissions,
    'subscription.invitationsPerCourse': (plan.invitationsPerCourse as number | undefined) || 5,
    'subscription.aiQuotas': {
      totalCredits: ((plan.aiQuotas as { totalCredits?: unknown } | undefined)?.totalCredits as number | undefined) || 0,
      usedCredits: 0,
    },
    'subscription.hasPremiumAI': (plan.hasPremiumAI as boolean | undefined) || false,
    'subscription.startDate': now,
  });

  console.log(`[SubscriptionEngine] Trial activado: ${tutorId} → Plan ${plan.name as string} (${trialDays} días)`);
  return ok({ trialDays, trialEndsAt });
}
