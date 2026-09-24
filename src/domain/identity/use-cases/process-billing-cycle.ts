/**
 * Identidad — Caso de uso: aviso de fin de trial / ciclo (F0.1).
 * Lógica 1:1 con `subscription-engine.processTrialEndingReminder`:
 * retorna antes si no hay `trialEndsAt`, `trialReminderDays ?? 5`,
 * `daysLeft = ceil((trialEndsAt - now) / día)`, email solo si
 * `daysLeft <= reminder && daysLeft > 0`. El envío sale por el
 * puerto `notifier` (el dominio no conoce `@/lib/emails`).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';
import { ceilDaysBetween } from '@/domain/shared/dates';
import { toDomainDate } from '@/domain/shared/firestore-mapping';

import type { SubscriptionRepository } from '../subscription-repository';
import type { SubscriptionPorts } from '../subscription-ports';

export const TrialReminderInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type TrialReminderInput = z.infer<typeof TrialReminderInputSchema>;

export interface TrialReminderResult {
  readonly reminded: boolean;
  readonly daysLeft: number | null;
}

export async function processTrialEndingReminder(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  rawInput: unknown,
): Promise<Result<TrialReminderResult, DomainError>> {
  const parsed = TrialReminderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de reminder inválidos', parsed.error.flatten()));
  }
  const now = parsed.data.now ?? new Date();

  const tutor = await repo.getUserSubscription(parsed.data.tutorId);
  if (!tutor?.subscription?.trialEndsAt) return ok({ reminded: false, daysLeft: null });

  const planId = tutor.subscription.planId as string | undefined;
  const plan = planId ? await repo.getPlan(planId) : null;
  const trialReminderDays = ((plan?.trialReminderDays ?? 5) as number);

  const trialEndsAt = toDomainDate(tutor.subscription.trialEndsAt as never);
  if (!trialEndsAt) return ok({ reminded: false, daysLeft: null });

  const daysLeft = ceilDaysBetween(now, trialEndsAt);

  if (daysLeft <= trialReminderDays && daysLeft > 0) {
    await ports.notifier.sendTrialEnding({
      email: tutor.email,
      name: tutor.displayName || 'Tutor',
      daysLeft,
      planName: (tutor.subscription.planName as string | undefined)
        || (plan?.name as string | undefined)
        || 'Fastoria',
    });
    console.log(`[SubscriptionEngine] Reminder enviado a ${tutor.email}: ${daysLeft} días restantes`);
    return ok({ reminded: true, daysLeft });
  }
  return ok({ reminded: false, daysLeft });
}
