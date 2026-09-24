/**
 * API — Handlers testeables de suscripciones (F0.1).
 * Reciben gateway y llamante inyectados (los route.ts solo cablearán
 * en F0.3/F1.1). Authz: operaciones propias (tutor o admin), suspensión
 * y reactivación sensibles (suspender = admin; reactivar = propio o admin).
 * Los puertos se inyectan en tests; por defecto usan emails + Stripe reales
 * (misma semántica que el engine legacy).
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import {
  activateTrial,
  handlePaymentResult,
  processTrialEndingReminder,
  reactivateTutor,
  suspendTutor,
  type PaymentEventInput,
} from '@/domain/identity/use-cases';
import type {
  ExternalBillingGateway,
  SubscriptionNotifier,
  SubscriptionPorts,
} from '@/domain/identity/subscription-ports';
import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import {
  sendAccountSuspendedEmail,
  sendPaymentFailedEmail,
  sendSubscriptionActivatedEmail,
  sendTrialEndingEmail,
} from '@/lib/emails/subscription';

import { canAccessMentorData, type Caller } from './mentor-auth';
import { forbidden, toApiResponse, unauthorized } from './results';

export interface SubscriptionHandlerDeps {
  readonly notifier?: SubscriptionNotifier;
  readonly billing?: ExternalBillingGateway;
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

function resolvePorts(deps?: SubscriptionHandlerDeps): SubscriptionPorts {
  return {
    notifier: deps?.notifier ?? productionNotifier(),
    billing: deps?.billing ?? productionBilling(),
  };
}

export async function handleActivateTrial(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
  planId: string,
  deps?: SubscriptionHandlerDeps,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!canAccessMentorData(caller, tutorId)) return forbidden();
  const repo = new FirestoreSubscriptionRepository(gateway);
  return toApiResponse(await activateTrial(repo, { tutorId, planId, now: deps?.now }));
}

export async function handleTrialReminder(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
  deps?: SubscriptionHandlerDeps,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!canAccessMentorData(caller, tutorId)) return forbidden();
  const repo = new FirestoreSubscriptionRepository(gateway);
  return toApiResponse(
    await processTrialEndingReminder(repo, resolvePorts(deps), { tutorId, now: deps?.now }),
  );
}

/** Evento de pasarela ya verificado en el borde (firma + rate-limit en el route). */
export async function handleBillingEvent(
  gateway: FirestoreGateway,
  caller: Caller | null,
  event: PaymentEventInput,
  deps?: SubscriptionHandlerDeps,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const tutorId = (event as { tutorId?: string }).tutorId;
  if (!tutorId || !canAccessMentorData(caller, tutorId)) return forbidden();
  const repo = new FirestoreSubscriptionRepository(gateway);
  return toApiResponse(await handlePaymentResult(repo, resolvePorts(deps), event));
}

export async function handleSuspendTutor(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
  deps?: SubscriptionHandlerDeps,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!caller.isAdmin) return forbidden();
  const repo = new FirestoreSubscriptionRepository(gateway);
  return toApiResponse(await suspendTutor(repo, resolvePorts(deps), { tutorId, now: deps?.now }));
}

export async function handleReactivateTutor(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
  deps?: SubscriptionHandlerDeps,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!canAccessMentorData(caller, tutorId)) return forbidden();
  const repo = new FirestoreSubscriptionRepository(gateway);
  return toApiResponse(await reactivateTutor(repo, { tutorId }));
}
