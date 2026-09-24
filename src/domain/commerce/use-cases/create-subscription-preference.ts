/**
 * Comercio — Crear preferencia de suscripción (F0.2).
 * Lógica 1:1 con `api/payments/subscribe`: validación de downgrade,
 * plan gratuito, trial con método requerido, o preferencia MP.
 * Sin SDK ni env: el token llega del repo y `appUrl` por input.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';
import type { SubscriptionRepository } from '@/domain/identity/subscription-repository';

import type { PaymentMethodRepository } from '../payment-method-repository';
import type { PaymentProvider } from '../payment-provider';
import type { TrialActivator } from '../payment-ports';
import { legacyHttpError } from './legacy-response';

export const CreateSubscriptionPreferenceInputSchema = z.object({
  planId: z.string().nullish(),
  userId: z.string().nullish(),
  email: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  paymentMethodId: z.string().nullish(),
  isUpgrade: z.boolean().optional(),
  upgradePrice: z.number().optional(),
  appUrl: z.string().default('https://FastoriaAcademy.ai'),
});
export type CreateSubscriptionPreferenceInput = z.infer<
  typeof CreateSubscriptionPreferenceInputSchema
>;

export interface SubscribeDeps {
  readonly subscriptions: SubscriptionRepository;
  readonly payments: PaymentMethodRepository;
  readonly provider: PaymentProvider;
  readonly trials: TrialActivator;
}

export type SubscribeOutcome =
  | { readonly kind: 'free' }
  | { readonly kind: 'trial'; readonly trialDays: number; readonly trialEndsAt: Date }
  | {
      readonly kind: 'preference';
      readonly id?: string;
      readonly initPoint?: string;
      readonly sandboxInitPoint?: string;
    };

export async function createSubscriptionPreference(
  deps: SubscribeDeps,
  rawInput: unknown,
): Promise<Result<SubscribeOutcome, DomainError>> {
  const parsed = CreateSubscriptionPreferenceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Plan ID y Email son obligatorios'));
  }
  const { planId, userId, email, firstName, lastName, paymentMethodId, isUpgrade, upgradePrice, appUrl } =
    parsed.data;

  if (!planId || !email) {
    return err(validationError('Plan ID y Email son obligatorios'));
  }

  const plan = await deps.subscriptions.getPlan(planId);
  if (!plan) {
    return err(notFound('El plan no existe'));
  }

  if (userId && userId !== 'new_mentor' && userId !== 'temp_lead') {
    const user = await deps.subscriptions.getUserSubscription(userId);
    const sub = user?.subscription ?? {};
    if (sub.status === 'active' && typeof sub.planId === 'string') {
      const current = await deps.subscriptions.getPlan(sub.planId);
      if (current && Number(plan.price) < Number(current.price) && plan.type !== 'free') {
        return err(
          validationError(
            'No es posible bajar de plan hasta que finalice la vigencia de tu suscripción actual.',
          ),
        );
      }
    }
  }

  const finalPrice = isUpgrade && upgradePrice !== undefined ? upgradePrice : Number(plan.price);

  if (finalPrice === 0 && !isUpgrade) {
    if (userId) {
      await deps.trials.activateTrial(userId, planId);
    }
    return ok({ kind: 'free' });
  }

  const trialDays = (plan.trialDays as number | undefined) ?? 0;
  if (trialDays > 0 && !isUpgrade && userId) {
    if (plan.requiresPaymentMethod !== false) {
      const hasMethod = await deps.payments.hasActiveTutorMethod(userId);
      if (!hasMethod) {
        return err(
          legacyHttpError(412, {
            error: 'required_payment_method',
            message:
              'Este plan requiere que cargues un medio de pago antes de activar el trial. Podrás usarlo gratuitamente durante el período de prueba.',
          }),
        );
      }
    }
    const { trialDays: days, trialEndsAt } = await deps.trials.activateTrial(userId, planId);
    return ok({ kind: 'trial', trialDays: days, trialEndsAt });
  }

  const paymentMethod = paymentMethodId
    ? await deps.payments.findSystemMethodById(paymentMethodId)
    : await deps.payments.findFirstActiveSystemMethod();

  if (!paymentMethod) {
    return err(legacyHttpError(500, { error: 'No hay métodos de pago configurados' }));
  }

  if (paymentMethod.type !== 'mercadopago') {
    return err(validationError('Método de pago no soportado'));
  }

  const accessToken = paymentMethod.config?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return err(legacyHttpError(500, { error: 'Credenciales incompletas' }));
  }

  const externalReference = JSON.stringify({
    userId: userId || 'new_mentor',
    planId,
    isUpgrade,
    leadData: { email, firstName, lastName },
  });

  const planName = typeof plan.name === 'string' ? plan.name : 'Plan';
  const result = await deps.provider.createSubscriptionPreference(accessToken, {
    planId,
    title: isUpgrade ? `Upgrade FastoriaAcademy: ${planName}` : `Suscripción FastoriaAcademy: ${planName}`,
    unitPrice: finalPrice,
    payer: { email, name: firstName ?? undefined, surname: lastName ?? undefined },
    externalReference,
    successUrl: `${appUrl}/dashboard?payment=success`,
    failureUrl: `${appUrl}/dashboard/plan?payment=failure`,
    pendingUrl: `${appUrl}/dashboard/plan?payment=pending`,
    notificationUrl: `${appUrl}/api/webhooks/mercadopago`,
  });

  return ok({ kind: 'preference', id: result.id, initPoint: result.initPoint, sandboxInitPoint: result.sandboxInitPoint });
}
