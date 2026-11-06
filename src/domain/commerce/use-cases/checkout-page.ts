/**
 * Comercio — Checkout de landing (F0.2).
 * Lógica 1:1 con `api/payments/checkout`: lee la sales page,
 * busca el método del tutor (con fallback legacy
 * `profile.mercadopago`) y delega a la pasarela.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { SalesPageLookup } from '../sales-page-lookup';
import type { PaymentMethodRepository } from '../payment-method-repository';
import type { CheckoutSessions } from '../payment-provider';
import { legacyHttpError } from './legacy-response';

export const CheckoutPageInputSchema = z.object({
  pageId: z.string().nullish(),
  studentEmail: z.string().nullish(),
  studentName: z.string().nullish(),
  referidoId: z.string().nullish(),
  gateway: z.string().default('mercadopago'),
  baseUrl: z.string().min(1),
  countryCode: z.string().optional(),
  exchangeRate: z.number().optional(),
});
export type CheckoutPageInput = z.infer<typeof CheckoutPageInputSchema>;

export interface CheckoutDeps {
  readonly pages: SalesPageLookup;
  readonly payments: PaymentMethodRepository;
  readonly sessions: CheckoutSessions;
}

export async function checkoutPage(
  deps: CheckoutDeps,
  rawInput: unknown,
): Promise<Result<Record<string, unknown>, DomainError>> {
  const parsed = CheckoutPageInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Faltan parámetros requeridos'));
  }
  const { pageId, studentEmail, studentName, referidoId, gateway, baseUrl, exchangeRate } = parsed.data;

  if (!pageId || !studentEmail) {
    return err(validationError('Faltan parámetros requeridos'));
  }

  const page = await deps.pages.findById(pageId);
  if (!page) {
    return err(notFound('Página de venta no encontrada'));
  }

  const mentorId = typeof page.mentorId === 'string' ? page.mentorId : '';
  const price = typeof page.price === 'number' ? page.price : 0;
  const title = typeof page.title === 'string' ? page.title : 'Inscripción a Programa';
  if (!mentorId) {
    return err(notFound('No se encontró un mentor para esta página'));
  }

  const method = await deps.payments.findTutorMethodByType(mentorId, gateway);
  let paymentConfig: Record<string, unknown> | undefined = method?.config;

  if (!paymentConfig && gateway === 'mercadopago') {
    const profile = await deps.payments.getMentorProfile(mentorId);
    const legacyMP = profile?.mercadopagoConfig;
    if (legacyMP?.accessToken) {
      paymentConfig = legacyMP;
    }
  }

  if (!paymentConfig) {
    return err(
      legacyHttpError(412, {
        error: `El tutor no ha configurado ${gateway.toUpperCase()}`,
        message: 'El tutor no ha cargado sus credenciales de cobro en su central de pagos.',
      }),
    );
  }

  // Precios por pasarela (nuevo modelo multimoneda guiado por pasarela)
  // Si la landing tiene configurado el precio específico para esta pasarela, se usa directamente sin conversiones automáticas.
  let finalChargePrice = price;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pricingConfig = page.pricing as any;
  const gatewayPriceItem = pricingConfig?.pricesByGateway?.[gateway];

  if (gatewayPriceItem && typeof gatewayPriceItem.amount === 'number' && gatewayPriceItem.amount >= 0) {
    finalChargePrice = gatewayPriceItem.amount;
  } else {
    // Fallback legacy para landings antiguas sin precios por pasarela
    const isCourseUsd = page.currency === 'USD';
    if ((gateway === 'mercadopago' || gateway === 'getnet') && isCourseUsd) {
      const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1540;
      finalChargePrice = Math.round(price * rate);
    } else if (gateway === 'stripe' && !isCourseUsd) {
      const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1540;
      finalChargePrice = Math.round((price / rate) * 100) / 100;
    }
  }

  const result = await deps.sessions.createSession(gateway, paymentConfig, {
    pageId,
    title,
    price: finalChargePrice,
    studentEmail,
    studentName: studentName ?? '',
    mentorId,
    referidoId: referidoId ?? undefined,
    baseUrl,
  });
  return ok(result);
}
