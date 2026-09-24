/**
 * API — Handlers testeables de webhooks (F1.1).
 *
 * Los webhooks se autentican por firma HMAC en el borde del route
 * (`verify-signature` + `rateLimitConfigs.webhook`, que se quedan en el
 * route en el mismo orden que hoy), NO por sesión de usuario: por eso la
 * firma es `(gateway, ...args)` SIN `caller` autenticado —a diferencia de
 * `subscription/payment/transfer-handlers`, que sí exigen `caller` porque
 * sirven a usuarios logueados—. Agregar `authenticateCaller` aquí rompería
 * a los proveedores (Stripe/MP/GetNet no tienen sesión).
 *
 * Contratos HTTP legacy exactos (los proveedores reintentan):
 * stripe `{received:true}`/500 `Fallo interno`; subscriptions
 * `{received:true}`/400 mensaje; mercadopago siempre 200 `{received:true}`;
 * getnet 200/400 `Order ID no encontrado en payload`/404
 * `Orden no encontrada`/500 `Error procesando webhook`.
 * Mismas colecciones/campos: `users` (`subscription.gatewaySubscriptionId`),
 * `systemPaymentMethods` (`type`+`isActive`), `pending_orders`.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { MercadoPagoPaymentProvider } from '@/data/payments/mercadopago-gateway';
import { LegacyEnrollmentService } from '@/data/payments/legacy-payment-services';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { processSuccessfulSubscription } from '@/lib/payments/subscription';
import type {
  ExternalBillingGateway,
  SubscriptionNotifier,
  SubscriptionPorts,
} from '@/domain/identity/subscription-ports';
import type { PaymentProvider } from '@/domain/commerce/payment-provider';
import {
  handleGatewayEvent,
  type GatewayEnrollmentPort,
  type GatewayEventInput,
  type GatewayPendingOrderStore,
  type GatewaySubscriptionActivationPort,
} from '@/domain/identity/use-cases';
import {
  sendAccountSuspendedEmail,
  sendPaymentFailedEmail,
  sendSubscriptionActivatedEmail,
  sendTrialEndingEmail,
} from '@/lib/emails/subscription';

export interface WebhookHandlerDeps {
  readonly notifier?: SubscriptionNotifier;
  readonly billing?: ExternalBillingGateway;
  readonly enrollment?: GatewayEnrollmentPort;
  readonly subscriptionActivation?: GatewaySubscriptionActivationPort;
  readonly provider?: PaymentProvider;
  /** Solo tests/determinismo. Por defecto, los use-cases usan `new Date()`. */
  readonly now?: Date;
}

function productionNotifier(): SubscriptionNotifier {
  return {
    sendTrialEnding: (n) => sendTrialEndingEmail(n.email, n.name, n.daysLeft, n.planName),
    sendSubscriptionActivated: (n) =>
      sendSubscriptionActivatedEmail(n.email, n.name, n.planName, n.nextBillingDate),
    sendPaymentFailed: (n) => sendPaymentFailedEmail(n.email, n.name, n.graceUntil),
    sendAccountSuspended: (n) => sendAccountSuspendedEmail(n.email, n.name),
  };
}

function productionBilling(): ExternalBillingGateway {
  return {
    cancelExternalSubscription: async (gateway, subscriptionId) => {
      if (gateway !== 'stripe') return;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-06-20' as never,
      });
      await stripe.subscriptions.cancel(subscriptionId);
    },
  };
}

function resolvePorts(deps?: WebhookHandlerDeps): SubscriptionPorts {
  return {
    notifier: deps?.notifier ?? productionNotifier(),
    billing: deps?.billing ?? productionBilling(),
  };
}

class LegacySubscriptionActivation implements GatewaySubscriptionActivationPort {
  async activateSubscription(input: {
    paymentId: string;
    planId: string;
    status: string;
    userId?: string;
    email?: string;
    displayName?: string;
    isUpgrade: boolean;
  }): Promise<{ success: boolean; userId?: string; reason?: string }> {
    const result = await processSuccessfulSubscription(
      input.paymentId,
      input.planId,
      input.status,
      { userId: input.userId, email: input.email ?? '', displayName: input.displayName ?? '' },
      input.isUpgrade,
    );
    if (!result.success) return { success: false, reason: result.reason };
    return { success: true, userId: result.userId };
  }
}

class FirestorePendingOrderStore implements GatewayPendingOrderStore {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(orderId: string) {
    const snap = await this.gateway.getDoc('pending_orders', orderId);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return {
      id: snap.id,
      status: raw.status,
      landingId: raw.landingId,
      buyerEmail: raw.buyerEmail,
      buyerName: raw.buyerName,
      tutorId: raw.tutorId,
      referidoId: raw.referidoId,
    };
  }

  async markCompleted(orderId: string): Promise<void> {
    await this.gateway.updateDoc('pending_orders', orderId, {
      status: 'completed',
      updatedAt: new Date(),
    });
  }

  async markFailed(orderId: string, status: string, payload: unknown): Promise<void> {
    await this.gateway.updateDoc('pending_orders', orderId, {
      status,
      updatedAt: new Date(),
      lastPayload: payload,
    });
  }
}

/**
 * `systemPaymentMethods where type == mercadopago && isActive == limit 1`
 * (idéntico al webhook legacy; `queryByTwoFields` cuando existe, si no
 * filtro en memoria sobre activas con el mismo resultado).
 */
async function findActiveMpAccessToken(gateway: FirestoreGateway): Promise<string | null> {
  if (gateway.queryByTwoFields) {
    const snap = await gateway.queryByTwoFields(
      'systemPaymentMethods',
      'type',
      'mercadopago',
      'isActive',
      true,
      1,
    );
    const raw = snap.docs[0]?.data() ?? {};
    const token = (raw.config as Record<string, unknown> | undefined)?.accessToken;
    return typeof token === 'string' ? token : null;
  }
  const methods = await new FirestorePaymentMethodRepository(gateway).listActiveSystemMethods();
  const found = methods.find((m) => m.type === 'mercadopago');
  const token = (found?.config as Record<string, unknown> | undefined)?.accessToken;
  return typeof token === 'string' ? token : null;
}

/** Evento Stripe ya verificado en el borde. Extracción 1:1 con el route legacy. */
export async function handleStripeWebhookEvent(
  gateway: FirestoreGateway,
  event: unknown,
  deps?: WebhookHandlerDeps,
): Promise<NextResponse> {
  try {
    const typed = event as { type: string; data: { object: Record<string, unknown> } };
    console.log(`[Stripe Webhook] Recibido evento: ${typed.type}`);
    const repo = new FirestoreSubscriptionRepository(gateway);
    let input: GatewayEventInput | null = null;

    switch (typed.type) {
      case 'checkout.session.completed': {
        const session = typed.data.object as {
          mode?: string;
          subscription?: unknown;
          metadata?: Record<string, string>;
        };
        const meta = session.metadata || {};
        if (session.mode === 'subscription' && session.subscription && meta.mentorId) {
          const subId =
            typeof session.subscription === 'string' ? session.subscription : (session.subscription as { id: string }).id;
          input = {
            provider: 'stripe',
            eventType: typed.type,
            tutorId: meta.mentorId,
            subscriptionId: subId,
          };
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = typed.data.object as { subscription?: unknown; lines?: { data?: { period?: { end?: number } }[] } };
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : (invoice.subscription as { id: string }).id;
          const nextBillingDate = new Date(
            ((invoice.lines?.data?.[0]?.period?.end || Date.now() / 1000 + 2592000) as number) * 1000,
          );
          input = {
            provider: 'stripe',
            eventType: typed.type,
            gatewaySubscriptionId: subId,
            nextBillingDate,
            now: deps?.now,
          };
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = typed.data.object as { subscription?: unknown };
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : (invoice.subscription as { id: string }).id;
          input = {
            provider: 'stripe',
            eventType: typed.type,
            gatewaySubscriptionId: subId,
            now: deps?.now,
          };
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = typed.data.object as { id: string };
        input = {
          provider: 'stripe',
          eventType: typed.type,
          gatewaySubscriptionId: subscription.id,
          now: deps?.now,
        };
        break;
      }
      default:
        break;
    }

    if (input) {
      const result = await handleGatewayEvent(
        repo,
        resolvePorts(deps),
        { enrollment: deps?.enrollment, subscriptionActivation: deps?.subscriptionActivation },
        input,
      );
      if (!result.ok) throw new Error(result.error.message);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Stripe Webhook] Error crítico:', error);
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 });
  }
}

/** Evento del webhook unificado ya verificado (gateway detectado por firma en el route). */
export async function handleSubscriptionsWebhookEvent(
  gateway: FirestoreGateway,
  provider: 'stripe' | 'getnet',
  event: unknown,
  deps?: WebhookHandlerDeps,
): Promise<NextResponse> {
  try {
    const typed = event as Record<string, unknown>;
    console.log(
      `[Webhooks] Recibido evento de ${provider}:`,
      (typed.type ?? typed.event_type) as string,
    );
    const repo = new FirestoreSubscriptionRepository(gateway);
    let input: GatewayEventInput | null = null;

    if (provider === 'stripe') {
      const data = (typed.data as { object: Record<string, unknown> }).object;
      const type = typed.type as string;
      switch (type) {
        case 'customer.subscription.created':
          if ((data.metadata as Record<string, string> | undefined)?.tutorId) {
            input = {
              provider: 'subscriptions',
              eventType: type,
              tutorId: (data.metadata as Record<string, string>).tutorId,
              subscriptionId: data.id as string,
              gateway: 'stripe',
            };
          }
          break;
        case 'invoice.payment_succeeded': {
          const subDetails = data.subscription_details as
            | { metadata?: Record<string, string> }
            | undefined;
          if (data.subscription && data.customer_email && subDetails?.metadata?.tutorId) {
            input = {
              provider: 'subscriptions',
              eventType: type,
              tutorId: subDetails.metadata.tutorId,
              gateway: 'stripe',
              now: deps?.now,
            };
          }
          break;
        }
        case 'invoice.payment_failed': {
          const subDetails = data.subscription_details as
            | { metadata?: Record<string, string> }
            | undefined;
          if (subDetails?.metadata?.tutorId) {
            input = {
              provider: 'subscriptions',
              eventType: type,
              tutorId: subDetails.metadata.tutorId,
              gateway: 'stripe',
              now: deps?.now,
            };
          }
          break;
        }
        case 'customer.subscription.deleted':
          if ((data.metadata as Record<string, string> | undefined)?.tutorId) {
            input = {
              provider: 'subscriptions',
              eventType: type,
              tutorId: (data.metadata as Record<string, string>).tutorId,
              gateway: 'stripe',
              now: deps?.now,
            };
          }
          break;
        default:
          console.log(`[Webhooks] Evento ignorado: ${type}`);
          break;
      }
    } else {
      const tutorId = (typed.metadata as Record<string, string> | undefined)?.tutorId;
      const eventType = typed.event_type as string;
      switch (eventType) {
        case 'subscription.created':
          if (tutorId) {
            input = {
              provider: 'subscriptions',
              eventType,
              tutorId,
              subscriptionId: typed.subscription_id as string,
              gateway: 'getnet',
            };
          }
          break;
        case 'payment.succeeded':
          if (tutorId) {
            input = { provider: 'subscriptions', eventType, tutorId, gateway: 'getnet', now: deps?.now };
          }
          break;
        case 'payment.failed':
          if (tutorId) {
            input = { provider: 'subscriptions', eventType, tutorId, gateway: 'getnet', now: deps?.now };
          }
          break;
        case 'subscription.canceled':
          if (tutorId) {
            input = { provider: 'subscriptions', eventType, tutorId, gateway: 'getnet', now: deps?.now };
          }
          break;
        default:
          break;
      }
    }

    if (input) {
      const result = await handleGatewayEvent(
        repo,
        resolvePorts(deps),
        { enrollment: deps?.enrollment, subscriptionActivation: deps?.subscriptionActivation },
        input,
      );
      if (!result.ok) throw new Error(result.error.message);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Webhooks] Error procesando evento:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Notificación MP ya recibida (este proveedor NO verifica firma: se preserva así). */
export async function handleMercadoPagoWebhookEvent(
  gateway: FirestoreGateway,
  input: { type?: string; dataId?: string },
  deps?: WebhookHandlerDeps,
): Promise<NextResponse> {
  try {
    const { type, dataId } = input;
    console.log(`[MP_WEBHOOK] Notificación recibida: ${type} - ID: ${dataId}`);

    if (type === 'payment' && dataId) {
      const accessToken = await findActiveMpAccessToken(gateway);
      if (!accessToken) {
        throw new Error('No hay métodos de pago configurados para validar el webhook');
      }
      const provider = deps?.provider ?? new MercadoPagoPaymentProvider();
      const paymentData = await provider.getPayment(accessToken, dataId);
      const status = paymentData?.status;
      const externalReference = paymentData?.externalReference;
      const paymentId = paymentData?.id ?? dataId;

      if (!externalReference) {
        console.warn(`[MP_WEBHOOK] Pago ${paymentId} no tiene external_reference. Ignorando.`);
        return NextResponse.json({ received: true });
      }

      const refData = JSON.parse(externalReference);
      const { userId, planId, leadData, isUpgrade } = refData;

      if (planId) {
        console.log(
          `[MP_WEBHOOK] Detectada Suscripción de Tutor para el pago ${paymentId} (Upgrade: ${!!isUpgrade})`,
        );
        const activator = deps?.subscriptionActivation ?? new LegacySubscriptionActivation();
        await activator.activateSubscription({
          paymentId: String(paymentId),
          planId,
          status: status || 'unknown',
          userId,
          email: leadData?.email || paymentData?.payerEmail,
          displayName: leadData ? `${leadData.firstName} ${leadData.lastName}` : '',
          isUpgrade: !!isUpgrade,
        });
      } else if (refData.pageId) {
        console.log(`[MP_WEBHOOK] Detectada Inscripción de Alumno para el pago ${paymentId}`);
        const enrollment = deps?.enrollment ?? new LegacyEnrollmentService();
        await enrollment.completeEnrollment({
          paymentId: String(paymentId),
          externalReference,
          status: status || 'unknown',
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[MP_WEBHOOK_ERROR]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ received: true, error: message });
  }
}

/** Payload GetNet ya verificado en el borde. */
export async function handleGetnetWebhookEvent(
  gateway: FirestoreGateway,
  input: { status?: string; orderId?: string; paymentId?: string; payload?: unknown },
  deps?: WebhookHandlerDeps,
): Promise<NextResponse> {
  try {
    const repo = new FirestoreSubscriptionRepository(gateway);
    const result = await handleGatewayEvent(
      repo,
      resolvePorts(deps),
      {
        enrollment: deps?.enrollment ?? new LegacyEnrollmentService(),
        subscriptionActivation: deps?.subscriptionActivation,
        pendingOrders: new FirestorePendingOrderStore(gateway),
      },
      {
        provider: 'getnet',
        eventType: input.status ?? '',
        orderId: input.orderId,
        paymentId: input.paymentId,
        status: input.status,
        payload: input.payload,
        now: deps?.now,
      },
    );
    if (!result.ok) {
      if (result.error.code === 'VALIDATION') {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }
      if (result.error.code === 'NOT_FOUND') {
        console.error('[Getnet Webhook] Orden no encontrada:', input.orderId);
        return NextResponse.json({ error: result.error.message }, { status: 404 });
      }
      throw new Error(result.error.message);
    }
    if (result.value.kind === 'order-updated') {
      console.log(`[Getnet Webhook] Orden ${input.orderId} actualizada con status: ${input.status}`);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Getnet Webhook Error]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
