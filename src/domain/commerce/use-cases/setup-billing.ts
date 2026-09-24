/**
 * Comercio — Setup de billing del tutor (F0.2).
 * Lógica 1:1 con `api/payments/setup-billing`: verifica el usuario
 * y delega al setup Stripe legacy. `baseUrl` llega por deps
 * (el route resolvía `NEXT_PUBLIC_APP_URL || localhost:9002`).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { PaymentMethodRepository } from '../payment-method-repository';
import type { BillingSetup } from '../payment-provider';

export const SetupBillingInputSchema = z.object({
  userId: z.string().nullish(),
});
export type SetupBillingInput = z.infer<typeof SetupBillingInputSchema>;

export interface SetupBillingDeps {
  readonly payments: PaymentMethodRepository;
  readonly billing: BillingSetup;
  readonly baseUrl: string;
}

export async function setupBilling(
  deps: SetupBillingDeps,
  rawInput: unknown,
): Promise<Result<{ url?: string | null }, DomainError>> {
  const parsed = SetupBillingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Falta userId'));
  }
  const { userId } = parsed.data;

  if (!userId) {
    return err(validationError('Falta userId'));
  }

  const profile = await deps.payments.getMentorProfile(userId);
  if (!profile) {
    return err(notFound('Usuario no encontrado'));
  }

  const email = typeof profile.email === 'string' ? profile.email : '';
  const { url } = await deps.billing.createSetup(userId, email, deps.baseUrl);
  return ok({ url });
}
