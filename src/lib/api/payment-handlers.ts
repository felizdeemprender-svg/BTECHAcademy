/**
 * API — Handlers testeables de pagos (F0.2).
 * Rutas públicas por contrato legacy (caller siempre null; se
 * mantiene el parámetro para la firma `(gateway, caller, ...)`).
 * Responden con los bodies/status exactos del legacy (NO
 * `toApiResponse`: los envelopes históricos no son `{ data }`
 * y usan 412/409 además de 400/404/500). El SDK MP llega
 * inyectado (`provider`) para tests; por defecto el gateway real.
 */
import { NextResponse } from 'next/server';

import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { FirestoreSalesPageLookup } from '@/data/firestore/sales-lookup-repo';
import { MercadoPagoPaymentProvider } from '@/data/payments/mercadopago-gateway';
import {
  LegacyBillingSetup,
  LegacyEnrollmentService,
  LegacyPaymentSessions,
} from '@/data/payments/legacy-payment-services';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { activateTrial as activateTrialUseCase } from '@/domain/identity/use-cases';
import type { DomainError } from '@/domain/shared/errors';
import type {
  BillingSetup,
  CheckoutSessions,
  PaymentProvider,
} from '@/domain/commerce/payment-provider';
import type {
  EnrollmentService,
  TrialActivator,
} from '@/domain/commerce/payment-ports';
import {
  checkoutPage,
  createSubscriptionPreference,
  processMpPayment,
  setupBilling,
} from '@/domain/commerce/use-cases';

import type { Caller } from './mentor-auth';

export interface PaymentHandlerDeps {
  readonly provider?: PaymentProvider;
  readonly sessions?: CheckoutSessions;
  readonly billing?: BillingSetup;
  readonly enrollment?: EnrollmentService;
  readonly trials?: TrialActivator;
  /** Igual que el legacy: `NEXT_PUBLIC_APP_URL || 'https://FastoriaAcademy.ai'`. */
  readonly appUrl?: string;
  /** Igual que el legacy: `NEXT_PUBLIC_APP_URL || 'http://localhost:9002'`. */
  readonly baseUrl?: string;
}

const SUBSCRIBE_APP_URL = 'https://FastoriaAcademy.ai';
const BILLING_BASE_URL = 'http://localhost:9002';

function productionTrials(gateway: FirestoreGateway): TrialActivator {
  const repo = new FirestoreSubscriptionRepository(gateway);
  return {
    activateTrial: async (tutorId: string, planId: string) => {
      const result = await activateTrialUseCase(repo, { tutorId, planId });
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  };
}

/** Respeta `{ status, body }` del dominio; si no, mapea el código. */
export function legacyErrorResponse(error: DomainError): NextResponse {
  const details = (error.details ?? {}) as { status?: unknown; body?: unknown };
  if (typeof details.status === 'number' && details.body && typeof details.body === 'object') {
    return NextResponse.json(details.body, { status: details.status });
  }
  if (error.code === 'VALIDATION') return NextResponse.json({ error: error.message }, { status: 400 });
  if (error.code === 'NOT_FOUND') return NextResponse.json({ error: error.message }, { status: 404 });
  if (error.code === 'FORBIDDEN') return NextResponse.json({ error: error.message }, { status: 403 });
  if (error.code === 'CONFLICT') return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ error: error.message }, { status: 500 });
}

export async function handleSubscribe(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: PaymentHandlerDeps,
): Promise<NextResponse> {
  try {
    const input = (body ?? {}) as Record<string, unknown>;
    const result = await createSubscriptionPreference(
      {
        subscriptions: new FirestoreSubscriptionRepository(gateway),
        payments: new FirestorePaymentMethodRepository(gateway),
        provider: deps?.provider ?? new MercadoPagoPaymentProvider(),
        trials: deps?.trials ?? productionTrials(gateway),
      },
      { ...input, appUrl: deps?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? SUBSCRIBE_APP_URL },
    );
    if (!result.ok) return legacyErrorResponse(result.error);
    const outcome = result.value;
    if (outcome.kind === 'free') {
      return NextResponse.json({ success: true, message: 'Plan activado correctamente' });
    }
    if (outcome.kind === 'trial') {
      return NextResponse.json({
        success: true,
        trial: true,
        trialDays: outcome.trialDays,
        trialEndsAt: outcome.trialEndsAt.toISOString(),
        message: `¡Bienvenido! Tu período de prueba gratuita de ${outcome.trialDays} días comenzó ahora. No se realizará ningún cobro hasta el ${outcome.trialEndsAt.toLocaleDateString('es-AR')}.`,
      });
    }
    return NextResponse.json({
      id: outcome.id,
      init_point: outcome.initPoint,
      sandbox_init_point: outcome.sandboxInitPoint,
    });
  } catch (error: unknown) {
    console.error('[API_SUBSCRIBE_ERROR]:', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function handleCheckout(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: PaymentHandlerDeps,
): Promise<NextResponse> {
  try {
    const result = await checkoutPage(
      {
        pages: new FirestoreSalesPageLookup(gateway),
        payments: new FirestorePaymentMethodRepository(gateway),
        sessions: deps?.sessions ?? new LegacyPaymentSessions(),
      },
      body,
    );
    if (!result.ok) return legacyErrorResponse(result.error);
    return NextResponse.json(result.value);
  } catch (error: unknown) {
    console.error(`[Checkout Orchestrator] Error:`, error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error interno procesando el checkout', details },
      { status: 500 },
    );
  }
}

export async function handleSetupBilling(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: PaymentHandlerDeps,
): Promise<NextResponse> {
  try {
    const result = await setupBilling(
      {
        payments: new FirestorePaymentMethodRepository(gateway),
        billing: deps?.billing ?? new LegacyBillingSetup(),
        baseUrl: deps?.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? BILLING_BASE_URL,
      },
      body,
    );
    if (!result.ok) return legacyErrorResponse(result.error);
    return NextResponse.json({ url: result.value.url });
  } catch (error: unknown) {
    console.error('[SetupBilling] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function handleListSystemMethods(
  gateway: FirestoreGateway,
  _caller: Caller | null,
): Promise<NextResponse> {
  try {
    const methods = await new FirestorePaymentMethodRepository(gateway).listActiveSystemMethods();
    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        description: m.description,
        icon: m.icon,
      })),
    });
  } catch (error: unknown) {
    console.error('[API_PAYMENT_METHODS_ERROR]:', error);
    return NextResponse.json({ error: 'Error al cargar métodos de pago' }, { status: 500 });
  }
}

export async function handleMpWebhook(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: PaymentHandlerDeps,
): Promise<NextResponse> {
  try {
    const raw = (body ?? {}) as Record<string, unknown>;
    const topic = (raw.type ?? raw.topic) as string | undefined;
    const data = raw.data as { id?: unknown } | undefined;
    const paymentIdRaw = data?.id ?? raw.id;
    const paymentId =
      paymentIdRaw === undefined || paymentIdRaw === null ? undefined : String(paymentIdRaw);
    const sellerId = String(raw.user_id);

    console.log(`[Webhook MP] Recibida notificación: ${topic} ID: ${paymentId} (Seller: ${sellerId})`);

    const result = await processMpPayment(
      {
        payments: new FirestorePaymentMethodRepository(gateway),
        provider: deps?.provider ?? new MercadoPagoPaymentProvider(),
        enrollment: deps?.enrollment ?? new LegacyEnrollmentService(),
      },
      { topic, paymentId, sellerId },
    );
    if (!result.ok) {
      if (result.error.code === 'NOT_FOUND' && result.error.message === 'Mentor mapping not found') {
        console.warn(`[Webhook MP] No se encontró un mentor vinculado al Seller ID: ${sellerId}`);
      }
      if (result.error.message === 'Mentor token missing') {
        console.error(`[Webhook MP] El mentor no tiene Access Token configurado.`);
      }
      return legacyErrorResponse(result.error);
    }
    if (result.value.kind === 'received') {
      if (paymentId) console.warn(`[Webhook MP] Pago ${paymentId} no tiene external_reference.`);
      return NextResponse.json({ received: true });
    }
    return NextResponse.json({ processed: true, ...result.value.result });
  } catch (error: unknown) {
    console.error('[Webhook MP Error]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * REDIRECT (Success URL): procesamiento sincrónico (fallback).
 * Devuelve redirects 1:1 con el GET legacy.
 */
export async function handleMpRedirect(
  _gateway: FirestoreGateway,
  _caller: Caller | null,
  params: { paymentId?: string; status?: string; externalReference?: string },
  origin: string,
  deps?: PaymentHandlerDeps,
): Promise<NextResponse> {
  try {
    const { paymentId, status, externalReference } = params;
    console.log(`[Redirect MP] Usuario regresó con estado: ${status}`);

    if (status === 'approved' && externalReference) {
      try {
        await (deps?.enrollment ?? new LegacyEnrollmentService()).completeEnrollment({
          paymentId: paymentId || 'manual_redirect',
          externalReference,
          status,
        });
        return NextResponse.redirect(`${origin}/dashboard/my-courses?enrolled=true`);
      } catch (e) {
        console.error('[Redirect MP] Error al procesar inscripción:', e);
      }
    }

    return NextResponse.redirect(`${origin}/dashboard/my-courses`);
  } catch (error: unknown) {
    console.error('[Redirect MP Error]', error);
    return NextResponse.redirect(`${origin}/dashboard/my-courses?error=system_error`);
  }
}
