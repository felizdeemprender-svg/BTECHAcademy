/**
 * Identidad — Caso de uso: cancelar suscripción propia (F0.3).
 * Lógica 1:1 con `POST api/subscriptions/cancel` legacy: 404 si no hay
 * usuario o no hay `subscription` (el repo devuelve `{}` cuando falta el
 * campo, así que el vacío también es NOT_FOUND), cancel local cuando no
 * hay `gatewaySubscriptionId`, cancel Stripe tolerante a fallos
 * (loguea y sigue, igual que el legacy) y GetNet como no-op con log.
 * Escribe el patch `subscription.status=canceled` + `canceledAt`.
 * Dominio puro: la cancelación externa sale por el puerto F0.1.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { SubscriptionRepository } from '../subscription-repository';
import type { ExternalBillingGateway } from '../subscription-ports';

export const CancelSubscriptionInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionInputSchema>;

export interface CancelSubscriptionResult {
  /** `true` cuando no había pasarela (mensaje legacy "sin pasarela"). */
  readonly localOnly: boolean;
}

export interface CancelSubscriptionPorts {
  readonly billing: ExternalBillingGateway;
}

export async function cancelSubscription(
  repo: SubscriptionRepository,
  ports: CancelSubscriptionPorts,
  rawInput: unknown,
): Promise<Result<CancelSubscriptionResult, DomainError>> {
  const parsed = CancelSubscriptionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de cancelación inválidos', parsed.error.flatten()));
  }
  const { tutorId } = parsed.data;
  const now = parsed.data.now ?? new Date();

  const tutor = await repo.getUserSubscription(tutorId);
  const subscription = tutor?.subscription;
  if (!tutor || !subscription || Object.keys(subscription).length === 0) {
    return err(notFound('Suscripción no encontrada'));
  }

  const gateway = subscription.gateway as string | undefined;
  const gatewaySubscriptionId = subscription.gatewaySubscriptionId as string | undefined;

  if (!gatewaySubscriptionId) {
    await repo.updateSubscriptionFields(tutorId, {
      'subscription.status': 'canceled',
      'subscription.canceledAt': now,
    });
    return ok({ localOnly: true });
  }

  if (gateway === 'stripe') {
    try {
      await ports.billing.cancelExternalSubscription('stripe', gatewaySubscriptionId);
      console.log(`[Cancel API] Cancelando suscripción en Stripe: ${gatewaySubscriptionId}`);
    } catch (error) {
      console.error(`[Cancel API] Falló cancelación en Stripe:`, (error as Error).message);
    }
  } else if (gateway === 'getnet') {
    console.log(`[Cancel API] Cancelación en GetNet delegada manualmente: ${gatewaySubscriptionId}`);
  }

  await repo.updateSubscriptionFields(tutorId, {
    'subscription.status': 'canceled',
    'subscription.canceledAt': now,
  });

  return ok({ localOnly: false });
}
