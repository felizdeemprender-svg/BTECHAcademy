/**
 * Kernel identidad — Puertos de efectos laterales de suscripciones (F0.1).
 * El engine legacy enviaba emails (`@/lib/emails/subscription`) y cancelaba
 * en Stripe directo; el dominio solo declara estas interfaces puras y la
 * infraestructura (`@/lib/api/subscription-handlers`, shim del engine)
 * las implementa. Facilitan tests con fakes en memoria.
 */

export interface TrialEndingNotice {
  readonly email: string;
  readonly name: string;
  readonly daysLeft: number;
  readonly planName: string;
}

export interface SubscriptionActivatedNotice {
  readonly email: string;
  readonly name: string;
  readonly planName: string;
  readonly nextBillingDate: string;
}

export interface PaymentFailedNotice {
  readonly email: string;
  readonly name: string;
  readonly graceUntil: string;
}

export interface AccountSuspendedNotice {
  readonly email: string;
  readonly name: string;
}

export interface SubscriptionNotifier {
  sendTrialEnding(notice: TrialEndingNotice): Promise<void>;
  sendSubscriptionActivated(notice: SubscriptionActivatedNotice): Promise<void>;
  sendPaymentFailed(notice: PaymentFailedNotice): Promise<void>;
  sendAccountSuspended(notice: AccountSuspendedNotice): Promise<void>;
}

export interface ExternalBillingGateway {
  /** Cancela la suscripción externa (Stripe real; GetNet/otros = no-op con log). */
  cancelExternalSubscription(gateway: string, subscriptionId: string): Promise<void>;
}

export interface SubscriptionPorts {
  readonly notifier: SubscriptionNotifier;
  readonly billing: ExternalBillingGateway;
}
