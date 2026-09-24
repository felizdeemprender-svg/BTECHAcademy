/**
 * Comercio — Webhook de Mercado Pago (F0.2).
 * Lógica 1:1 con el POST de `api/payments/mercadopago/webhook`:
 * solo `topic === 'payment'` se procesa; el mentor se resuelve por
 * `mp_seller_mappings`, el token por `users.profile.mercadopago`,
 * el pago se consulta por SDK (puerto) y la inscripción usa el
 * mismo flujo que el redirect. Sin SDK ni Firebase en dominio.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, type DomainError } from '@/domain/shared/errors';

import type { PaymentMethodRepository } from '../payment-method-repository';
import type { PaymentProvider } from '../payment-provider';
import type { EnrollmentCompletionResult, EnrollmentService } from '../payment-ports';
import { legacyHttpError } from './legacy-response';

export const ProcessMpPaymentInputSchema = z.object({
  topic: z.string().nullish(),
  paymentId: z.string().nullish(),
  sellerId: z.string().nullish(),
});
export type ProcessMpPaymentInput = z.infer<typeof ProcessMpPaymentInputSchema>;

export interface ProcessMpPaymentDeps {
  readonly payments: PaymentMethodRepository;
  readonly provider: PaymentProvider;
  readonly enrollment: EnrollmentService;
}

export type ProcessMpPaymentResult =
  | { readonly kind: 'received' }
  | { readonly kind: 'processed'; readonly result: EnrollmentCompletionResult };

export async function processMpPayment(
  deps: ProcessMpPaymentDeps,
  rawInput: unknown,
): Promise<Result<ProcessMpPaymentResult, DomainError>> {
  const parsed = ProcessMpPaymentInputSchema.safeParse(rawInput);
  const topic = parsed.success ? parsed.data.topic : undefined;
  const paymentId = parsed.success ? parsed.data.paymentId : undefined;
  const sellerId = parsed.success ? parsed.data.sellerId : undefined;

  if (topic !== 'payment') {
    return ok({ kind: 'received' });
  }

  const mentorId = await deps.payments.findMentorIdBySellerId(sellerId ?? '');
  if (!mentorId) {
    return err(notFound('Mentor mapping not found'));
  }

  const profile = await deps.payments.getMentorProfile(mentorId);
  const mpAccessToken = profile?.mercadopagoConfig?.accessToken;
  if (typeof mpAccessToken !== 'string' || mpAccessToken.length === 0) {
    return err(legacyHttpError(500, { error: 'Mentor token missing' }));
  }

  const paymentData = await deps.provider.getPayment(mpAccessToken, paymentId ?? '');
  if (!paymentData || !paymentData.externalReference) {
    return ok({ kind: 'received' });
  }

  const result = await deps.enrollment.completeEnrollment({
    paymentId: String(paymentId),
    externalReference: paymentData.externalReference,
    status: paymentData.status || 'pending',
  });
  return ok({ kind: 'processed', result });
}
