/**
 * Identidad — Caso de uso: resultado de pago / evento de pasarela (F0.1).
 * Cubre `handleSubscriptionCreated/Succeeded/Failed/Canceled` del engine
 * legacy por discriminante `kind`. Semántica 1:1: reemplazo "una pisa a
 * la otra" con cancel Stripe tolerante a fallos, dunning con
 * `gracePeriodDays ?? 7`, `billingCycleMonths ?? 1`, reactivación si estaba
 * `suspended`, y `canceled` que delega a `suspendTutor`. Efectos externos
 * (emails, cancel Stripe) salen por `SubscriptionPorts`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';
import { addDays, addMonths, formatDayMonthYear } from '@/domain/shared/dates';

import type { SubscriptionRepository } from '../subscription-repository';
import type { SubscriptionPorts } from '../subscription-ports';
import { reactivateTutor, suspendTutor } from './suspend-reactivate-tutor';

const TutorIdSchema = z.string().min(1, 'tutorId vacío');

export const PaymentEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('created'),
    tutorId: TutorIdSchema,
    subscriptionId: z.string().min(1, 'subscriptionId vacío'),
    gateway: z.string().min(1, 'gateway vacío'),
  }),
  z.object({
    kind: z.literal('succeeded'),
    tutorId: TutorIdSchema,
    nextBillingDate: z.date().optional(),
    now: z.date().optional(),
  }),
  z.object({
    kind: z.literal('failed'),
    tutorId: TutorIdSchema,
    now: z.date().optional(),
  }),
  z.object({
    kind: z.literal('canceled'),
    tutorId: TutorIdSchema,
    now: z.date().optional(),
  }),
]);
export type PaymentEventInput = z.infer<typeof PaymentEventSchema>;

export type PaymentResultOutcome =
  | { readonly kind: 'created'; readonly replaced: boolean }
  | { readonly kind: 'succeeded'; readonly nextBillingAt: Date; readonly reactivated: boolean }
  | { readonly kind: 'failed'; readonly skipped: boolean; readonly gracePeriodEndsAt?: Date }
  | { readonly kind: 'canceled'; readonly skipped: boolean; readonly suspendedPages: number };

export async function handlePaymentResult(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  rawEvent: unknown,
): Promise<Result<PaymentResultOutcome, DomainError>> {
  const parsed = PaymentEventSchema.safeParse(rawEvent);
  if (!parsed.success) {
    return err(validationError('Evento de pago inválido', parsed.error.flatten()));
  }
  switch (parsed.data.kind) {
    case 'created':
      return handleCreated(repo, ports, parsed.data);
    case 'succeeded':
      return handleSucceeded(repo, ports, parsed.data);
    case 'failed':
      return handleFailed(repo, ports, parsed.data);
    case 'canceled': {
      const suspended = await suspendTutor(repo, ports, {
        tutorId: parsed.data.tutorId,
        now: parsed.data.now,
      });
      if (!suspended.ok) return suspended;
      return ok({ kind: 'canceled', ...suspended.value });
    }
  }
}

async function handleCreated(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  event: Extract<PaymentEventInput, { kind: 'created' }>,
): Promise<Result<PaymentResultOutcome, DomainError>> {
  const tutor = await repo.getUserSubscription(event.tutorId);

  const oldSubId = tutor?.subscription?.gatewaySubscriptionId as string | undefined;
  const replaced = Boolean(oldSubId && oldSubId !== event.subscriptionId);
  if (replaced) {
    const oldGateway = tutor?.subscription?.gateway as string | undefined;
    console.log(
      `[SubscriptionEngine] Reemplazo de suscripción. Cancelando anterior externa: ${oldSubId} (${oldGateway})`,
    );
    if (oldGateway === 'stripe') {
      try {
        await ports.billing.cancelExternalSubscription('stripe', oldSubId as string);
        console.log(`[SubscriptionEngine] Suscripción anterior de Stripe cancelada: ${oldSubId}`);
      } catch (error) {
        console.error(
          `[SubscriptionEngine] No se pudo cancelar suscripción de Stripe ${oldSubId}:`,
          (error as Error).message,
        );
      }
    } else if (oldGateway === 'getnet') {
      console.log(
        `[SubscriptionEngine] Cancelación en GetNet delegada manualmente o pendiente de SDK para ${oldSubId}`,
      );
    }
  }

  await repo.updateSubscriptionFields(event.tutorId, {
    'subscription.gateway': event.gateway,
    'subscription.gatewaySubscriptionId': event.subscriptionId,
  });
  console.log(
    `[SubscriptionEngine] Suscripción externa enlazada: ${event.tutorId} → ${event.subscriptionId} (${event.gateway})`,
  );
  return ok({ kind: 'created', replaced });
}

async function handleSucceeded(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  event: Extract<PaymentEventInput, { kind: 'succeeded' }>,
): Promise<Result<PaymentResultOutcome, DomainError>> {
  const now = event.now ?? new Date();
  const tutor = await repo.getUserSubscription(event.tutorId);
  if (!tutor) {
    return err(notFound(`Usuario ${event.tutorId} no encontrado`));
  }

  let reactivated = false;
  if (tutor.subscription?.status === 'suspended') {
    const reactivatedResult = await reactivateTutor(repo, { tutorId: event.tutorId });
    if (!reactivatedResult.ok) return reactivatedResult;
    reactivated = true;
  }

  const planId = tutor.subscription?.planId as string | undefined;
  const rawPlan = planId ? await repo.getPlan(planId) : null;
  const plan = rawPlan ?? { id: planId ?? '', name: 'Plan Actual' };

  const nextBillingAt = event.nextBillingDate
    ?? addMonths(now, ((plan.billingCycleMonths ?? 1) as number));

  await repo.updateSubscriptionFields(event.tutorId, {
    'subscription.status': 'active',
    'subscription.nextBillingAt': nextBillingAt,
    'subscription.gracePeriodEndsAt': null,
    'subscription.lastBilledAt': now,
  });

  await ports.notifier.sendSubscriptionActivated({
    email: tutor.email,
    name: tutor.displayName || 'Tutor',
    planName: plan.name as string,
    nextBillingDate: formatDayMonthYear(nextBillingAt),
  });

  console.log(
    `[SubscriptionEngine] Pago recurrente exitoso (Webhook): ${event.tutorId}. Próximo cobro: ${formatDayMonthYear(nextBillingAt)}`,
  );
  return ok({ kind: 'succeeded', nextBillingAt, reactivated });
}

async function handleFailed(
  repo: SubscriptionRepository,
  ports: SubscriptionPorts,
  event: Extract<PaymentEventInput, { kind: 'failed' }>,
): Promise<Result<PaymentResultOutcome, DomainError>> {
  const now = event.now ?? new Date();
  const tutor = await repo.getUserSubscription(event.tutorId);
  if (!tutor) return ok({ kind: 'failed', skipped: true });

  const planId = tutor.subscription?.planId as string | undefined;
  const plan = planId ? await repo.getPlan(planId) : null;
  const gracePeriodDays = ((plan?.gracePeriodDays ?? 7) as number);
  const gracePeriodEndsAt = addDays(now, gracePeriodDays);

  await repo.updateSubscriptionFields(event.tutorId, {
    'subscription.status': 'past_due',
    'subscription.gracePeriodEndsAt': gracePeriodEndsAt,
    'subscription.failedBillingAt': now,
  });

  await ports.notifier.sendPaymentFailed({
    email: tutor.email,
    name: tutor.displayName || 'Tutor',
    graceUntil: formatDayMonthYear(gracePeriodEndsAt),
  });

  console.log(
    `[SubscriptionEngine] Pago recurrente fallido (Webhook) para ${event.tutorId}. Gracia hasta ${formatDayMonthYear(gracePeriodEndsAt)}`,
  );
  return ok({ kind: 'failed', skipped: false, gracePeriodEndsAt });
}
