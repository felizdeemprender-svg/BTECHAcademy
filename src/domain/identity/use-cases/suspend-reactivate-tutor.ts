/**
 * Identidad — Casos de uso: suspender / reactivar tutor (F0.1).
 * Lógica 1:1 con `subscription-engine.suspendTutor`/`reactivateTutor`:
 * patch `subscription.status` (+ `suspendedAt` / nulos), pausa/restaura
 * `salesPages` vía `suspendPages`/`reactivatePages` del repo
 * (filtros `mentorId ==` + `status ==`, batch), email solo al suspender.
 * `reactivateTutor` no lee el usuario ni envía email (igual que el legacy).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';

import type { SubscriptionRepository } from '../subscription-repository';
import type { SubscriptionPorts } from '../subscription-ports';

export const TutorLifecycleInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type TutorLifecycleInput = z.infer<typeof TutorLifecycleInputSchema>;

export interface SuspendTutorResult {
  readonly skipped: boolean;
  readonly suspendedPages: number;
}

export interface ReactivateTutorResult {
  readonly reactivatedPages: number;
}

export async function suspendTutor(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  rawInput: unknown,
): Promise<Result<SuspendTutorResult, DomainError>> {
  const parsed = TutorLifecycleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de suspensión inválidos', parsed.error.flatten()));
  }
  const now = parsed.data.now ?? new Date();

  const tutor = await repo.getUserSubscription(parsed.data.tutorId);
  if (!tutor) return ok({ skipped: true, suspendedPages: 0 });

  await repo.updateSubscriptionFields(parsed.data.tutorId, {
    'subscription.status': 'suspended',
    'subscription.suspendedAt': now,
  });

  const suspendedPages = await repo.suspendPages(parsed.data.tutorId);

  await ports.notifier.sendAccountSuspended({
    email: tutor.email,
    name: tutor.displayName || 'Tutor',
  });

  console.log(`[SubscriptionEngine] Tutor ${parsed.data.tutorId} suspendido. Landings pausadas: ${suspendedPages}`);
  return ok({ skipped: false, suspendedPages });
}

export async function reactivateTutor(
  repo: SubscriptionRepository,
  rawInput: unknown,
): Promise<Result<ReactivateTutorResult, DomainError>> {
  const parsed = TutorLifecycleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de reactivación inválidos', parsed.error.flatten()));
  }

  await repo.updateSubscriptionFields(parsed.data.tutorId, {
    'subscription.status': 'active',
    'subscription.gracePeriodEndsAt': null,
    'subscription.suspendedAt': null,
  });

  const reactivatedPages = await repo.reactivatePages(parsed.data.tutorId);

  console.log(
    `[SubscriptionEngine] Tutor ${parsed.data.tutorId} reactivado. Landings restauradas: ${reactivatedPages}`,
  );
  return ok({ reactivatedPages });
}
