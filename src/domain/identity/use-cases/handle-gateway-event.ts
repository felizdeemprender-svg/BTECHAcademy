/**
 * Identidad — Caso de uso: evento de pasarela ya verificado (F1.1).
 * Discrimina proveedor (`stripe`/`getnet`/`mercadopago`/`subscriptions`) y
 * tipo de evento, y delega a `handlePaymentResult` (F0.1) o a los puertos
 * de inscripción/activación con los mismos argumentos que hoy les pasa
 * cada webhook. Puro e idempotente: lookup por `gatewaySubscriptionId`
 * antes de escribir (igual que hoy
 * `users.where('subscription.gatewaySubscriptionId','==')`); sin match →
 * `ignored` sin escrituras. Sin `firebase`/`next`/`@/data`/`@/lib`.
 *
 * Nota MP (verificado F0.2): `processMpPayment` cubre el flujo
 * seller-mapping de `api/payments/mercadopago/webhook`, DISTINTO del flujo
 * `systemPaymentMethods` + `planId`/`pageId` de `api/webhooks/mercadopago`;
 * reusarlo aquí cambiaría el contrato, así que este use-case delega ese
 * flujo a los puertos (que envuelven el legacy con idénticos argumentos)
 * y NO duplica su lógica.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { SubscriptionRepository } from '../subscription-repository';
import type { SubscriptionPorts } from '../subscription-ports';
import { handlePaymentResult, type PaymentResultOutcome } from './handle-payment-result';

export const GatewayEventSchema = z.object({
  provider: z.enum(['stripe', 'getnet', 'mercadopago', 'subscriptions']),
  eventType: z.string().min(1, 'eventType vacío'),
  gatewaySubscriptionId: z.string().optional(),
  tutorId: z.string().optional(),
  subscriptionId: z.string().optional(),
  gateway: z.string().optional(),
  nextBillingDate: z.date().optional(),
  now: z.date().optional(),
  paymentId: z.string().optional(),
  status: z.string().optional(),
  planId: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  isUpgrade: z.boolean().optional(),
  externalReference: z.string().optional(),
  pageId: z.string().optional(),
  orderId: z.string().optional(),
  payload: z.unknown().optional(),
});
export type GatewayEventInput = z.infer<typeof GatewayEventSchema>;

/** Lookup `users where subscription.gatewaySubscriptionId ==` (idéntico al legacy). */
export interface GatewaySubscriptionLookup {
  findTutorIdByGatewaySubscriptionId(subscriptionId: string): Promise<string | null>;
}

export interface GatewayEnrollmentPort {
  completeEnrollment(input: {
    paymentId: string;
    externalReference: string;
    status: string;
  }): Promise<{ success: boolean; alreadyEnrolled?: boolean; enrollmentId?: string; reason?: string }>;
}

export interface GatewaySubscriptionActivationPort {
  activateSubscription(input: {
    paymentId: string;
    planId: string;
    status: string;
    userId?: string;
    email?: string;
    displayName?: string;
    isUpgrade: boolean;
  }): Promise<{ success: boolean; userId?: string; reason?: string }>;
}

export interface GatewayPendingOrderSnapshot {
  readonly id: string;
  readonly status?: unknown;
  readonly landingId?: unknown;
  readonly buyerEmail?: unknown;
  readonly buyerName?: unknown;
  readonly tutorId?: unknown;
  readonly referidoId?: unknown;
}

export interface GatewayPendingOrderStore {
  findById(orderId: string): Promise<GatewayPendingOrderSnapshot | null>;
  markCompleted(orderId: string): Promise<void>;
  markFailed(orderId: string, status: string, payload: unknown): Promise<void>;
}

export interface GatewayEventSideEffects {
  readonly enrollment?: GatewayEnrollmentPort;
  readonly subscriptionActivation?: GatewaySubscriptionActivationPort;
  readonly pendingOrders?: GatewayPendingOrderStore;
}

export type GatewayEventOutcome =
  | { readonly kind: 'payment'; readonly result: PaymentResultOutcome }
  | { readonly kind: 'ignored'; readonly reason: string }
  | { readonly kind: 'received' }
  | { readonly kind: 'subscription-activated'; readonly userId?: string }
  | { readonly kind: 'enrolled'; readonly enrollmentId?: string; readonly alreadyEnrolled?: boolean }
  | { readonly kind: 'order-updated'; readonly status: string };

export async function handleGatewayEvent(
  repo: SubscriptionRepository & Partial<GatewaySubscriptionLookup>,
  ports: SubscriptionPorts,
  side: GatewayEventSideEffects,
  rawInput: unknown,
): Promise<Result<GatewayEventOutcome, DomainError>> {
  const parsed = GatewayEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Evento de pasarela inválido', parsed.error.flatten()));
  }
  const input = parsed.data;
  switch (input.provider) {
    case 'stripe':
      return handleStripe(repo, ports, input);
    case 'subscriptions':
      return handleSubscriptions(repo, ports, input);
    case 'mercadopago':
      return handleMercadoPago(side, input);
    case 'getnet':
      return handleGetnetOrder(side, input);
  }
}

async function resolveByLookup(
  repo: SubscriptionRepository & Partial<GatewaySubscriptionLookup>,
  tutorId: string | undefined,
  gatewaySubscriptionId: string | undefined,
): Promise<string | null> {
  if (tutorId) return tutorId;
  if (!gatewaySubscriptionId) return null;
  if (typeof repo.findTutorIdByGatewaySubscriptionId !== 'function') return null;
  return repo.findTutorIdByGatewaySubscriptionId(gatewaySubscriptionId);
}

async function handleStripe(
  repo: SubscriptionRepository & Partial<GatewaySubscriptionLookup>,
  ports: SubscriptionPorts,
  input: GatewayEventInput,
): Promise<Result<GatewayEventOutcome, DomainError>> {
  switch (input.eventType) {
    case 'checkout.session.completed': {
      if (!input.tutorId || !input.subscriptionId) {
        return ok({ kind: 'ignored', reason: 'missing-tutor-or-subscription' });
      }
      const result = await handlePaymentResult(repo, ports, {
        kind: 'created',
        tutorId: input.tutorId,
        subscriptionId: input.subscriptionId,
        gateway: 'stripe',
      });
      if (!result.ok) return result;
      return ok({ kind: 'payment', result: result.value });
    }
    case 'invoice.paid': {
      const tutorId = await resolveByLookup(repo, input.tutorId, input.gatewaySubscriptionId);
      if (!tutorId) return ok({ kind: 'ignored', reason: 'unknown-subscription' });
      const result = await handlePaymentResult(repo, ports, {
        kind: 'succeeded',
        tutorId,
        nextBillingDate: input.nextBillingDate,
        now: input.now,
      });
      if (!result.ok) return result;
      return ok({ kind: 'payment', result: result.value });
    }
    case 'invoice.payment_failed': {
      const tutorId = await resolveByLookup(repo, input.tutorId, input.gatewaySubscriptionId);
      if (!tutorId) return ok({ kind: 'ignored', reason: 'unknown-subscription' });
      const result = await handlePaymentResult(repo, ports, {
        kind: 'failed',
        tutorId,
        now: input.now,
      });
      if (!result.ok) return result;
      return ok({ kind: 'payment', result: result.value });
    }
    case 'customer.subscription.deleted': {
      const tutorId = await resolveByLookup(repo, input.tutorId, input.gatewaySubscriptionId);
      if (!tutorId) return ok({ kind: 'ignored', reason: 'unknown-subscription' });
      const result = await handlePaymentResult(repo, ports, {
        kind: 'canceled',
        tutorId,
        now: input.now,
      });
      if (!result.ok) return result;
      return ok({ kind: 'payment', result: result.value });
    }
    default:
      return ok({ kind: 'ignored', reason: `unknown-event:${input.eventType}` });
  }
}

async function handleSubscriptions(
  repo: SubscriptionRepository & Partial<GatewaySubscriptionLookup>,
  ports: SubscriptionPorts,
  input: GatewayEventInput,
): Promise<Result<GatewayEventOutcome, DomainError>> {
  const gateway = input.gateway ?? 'stripe';
  const createdTypes = ['customer.subscription.created', 'subscription.created'];
  const succeededTypes = ['invoice.payment_succeeded', 'payment.succeeded'];
  const failedTypes = ['invoice.payment_failed', 'payment.failed'];
  const canceledTypes = ['customer.subscription.deleted', 'subscription.canceled'];

  if (createdTypes.includes(input.eventType)) {
    if (!input.tutorId) return ok({ kind: 'ignored', reason: 'missing-tutor' });
    const subscriptionId = input.subscriptionId ?? input.gatewaySubscriptionId ?? '';
    if (!subscriptionId) return ok({ kind: 'ignored', reason: 'missing-subscription' });
    const result = await handlePaymentResult(repo, ports, {
      kind: 'created',
      tutorId: input.tutorId,
      subscriptionId,
      gateway,
    });
    if (!result.ok) return result;
    return ok({ kind: 'payment', result: result.value });
  }
  if (succeededTypes.includes(input.eventType)) {
    if (!input.tutorId) return ok({ kind: 'ignored', reason: 'missing-tutor' });
    const result = await handlePaymentResult(repo, ports, {
      kind: 'succeeded',
      tutorId: input.tutorId,
      nextBillingDate: input.nextBillingDate,
      now: input.now,
    });
    if (!result.ok) return result;
    return ok({ kind: 'payment', result: result.value });
  }
  if (failedTypes.includes(input.eventType)) {
    if (!input.tutorId) return ok({ kind: 'ignored', reason: 'missing-tutor' });
    const result = await handlePaymentResult(repo, ports, {
      kind: 'failed',
      tutorId: input.tutorId,
      now: input.now,
    });
    if (!result.ok) return result;
    return ok({ kind: 'payment', result: result.value });
  }
  if (canceledTypes.includes(input.eventType)) {
    if (!input.tutorId) return ok({ kind: 'ignored', reason: 'missing-tutor' });
    const result = await handlePaymentResult(repo, ports, {
      kind: 'canceled',
      tutorId: input.tutorId,
      now: input.now,
    });
    if (!result.ok) return result;
    return ok({ kind: 'payment', result: result.value });
  }
  return ok({ kind: 'ignored', reason: `unknown-event:${input.eventType}` });
}

async function handleMercadoPago(
  side: GatewayEventSideEffects,
  input: GatewayEventInput,
): Promise<Result<GatewayEventOutcome, DomainError>> {
  if (input.eventType !== 'payment') {
    return ok({ kind: 'received' });
  }
  const paymentId = input.paymentId ?? '';
  const status = input.status ?? 'unknown';
  if (input.planId) {
    if (!side.subscriptionActivation) {
      return err(validationError('Sin puerto de activación de suscripción'));
    }
    const activated = await side.subscriptionActivation.activateSubscription({
      paymentId,
      planId: input.planId,
      status,
      userId: input.userId,
      email: input.email,
      displayName: input.displayName,
      isUpgrade: input.isUpgrade ?? false,
    });
    if (!activated.success && activated.reason === 'not_approved') {
      return ok({ kind: 'received' });
    }
    return ok({ kind: 'subscription-activated', userId: activated.userId });
  }
  if (input.pageId || input.externalReference) {
    if (!input.externalReference) {
      return ok({ kind: 'received' });
    }
    if (!side.enrollment) {
      return err(validationError('Sin puerto de inscripción'));
    }
    const completed = await side.enrollment.completeEnrollment({
      paymentId,
      externalReference: input.externalReference,
      status,
    });
    if (!completed.success && completed.reason === 'not_approved') {
      return ok({ kind: 'received' });
    }
    return ok({
      kind: 'enrolled',
      enrollmentId: completed.enrollmentId,
      alreadyEnrolled: completed.alreadyEnrolled,
    });
  }
  return ok({ kind: 'received' });
}

async function handleGetnetOrder(
  side: GatewayEventSideEffects,
  input: GatewayEventInput,
): Promise<Result<GatewayEventOutcome, DomainError>> {
  const orderId = input.orderId ?? '';
  if (!orderId) {
    return err(validationError('Order ID no encontrado en payload'));
  }
  if (!side.pendingOrders) {
    return err(validationError('Sin puerto de órdenes pendientes'));
  }
  const order = await side.pendingOrders.findById(orderId);
  if (!order) {
    return err(notFound('Orden no encontrada'));
  }
  const status = String(input.status ?? '');
  if (status === 'APPROVED' || status === 'AUTHORIZED') {
    const paymentId = input.paymentId ?? orderId;
    const externalReference = JSON.stringify({
      pageId: order.landingId,
      studentEmail: order.buyerEmail,
      studentName: order.buyerName,
      mentorId: order.tutorId,
      referidoId: order.referidoId ?? null,
    });
    if (!side.enrollment) {
      return err(validationError('Sin puerto de inscripción'));
    }
    const completed = await side.enrollment.completeEnrollment({
      paymentId,
      externalReference,
      status: 'approved',
    });
    await side.pendingOrders.markCompleted(orderId);
    return ok({
      kind: 'enrolled',
      enrollmentId: completed.enrollmentId,
      alreadyEnrolled: completed.alreadyEnrolled,
    });
  }
  await side.pendingOrders.markFailed(orderId, status || 'failed', input.payload ?? null);
  return ok({ kind: 'order-updated', status: status || 'failed' });
}
