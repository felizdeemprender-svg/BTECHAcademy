/**
 * Comercio — Puerto de pasarela de pagos (F0.2).
 * El dominio declara tipos mínimos que usa el legacy; la
 * implementación con SDK (`mercadopago`) vive en
 * `@/data/payments/mercadopago-gateway`. Las sesiones de
 * checkout (mercadopago/getnet/stripe) y el setup de billing
 * (Stripe) delegan al orquestador legacy vía este mismo puerto
 * para no cambiar ni storage ni comportamiento.
 */

export interface PreferencePayer {
  readonly email?: string;
  readonly name?: string;
  readonly surname?: string;
}

export interface SubscriptionPreferenceRequest {
  readonly planId: string;
  readonly title: string;
  readonly unitPrice: number;
  readonly payer: PreferencePayer;
  readonly externalReference: string;
  readonly successUrl: string;
  readonly failureUrl: string;
  readonly pendingUrl: string;
  readonly notificationUrl: string;
}

export interface SubscriptionPreferenceResult {
  readonly id?: string;
  readonly initPoint?: string;
  readonly sandboxInitPoint?: string;
}

export interface PaymentDetails {
  readonly id: string;
  readonly externalReference?: string;
  readonly status?: string;
  /** F1.1 (aditivo): email del pagador para el fallback de `api/webhooks/mercadopago`. */
  readonly payerEmail?: string;
}

/** Mercado Pago: preferencia de suscripción + consulta de pago. */
export interface PaymentProvider {
  createSubscriptionPreference(
    accessToken: string,
    req: SubscriptionPreferenceRequest,
  ): Promise<SubscriptionPreferenceResult>;
  getPayment(accessToken: string, paymentId: string): Promise<PaymentDetails | null>;
}

export interface CheckoutSessionParams {
  readonly pageId: string;
  readonly title: string;
  readonly price: number;
  readonly studentEmail: string;
  readonly studentName: string;
  readonly mentorId: string;
  readonly referidoId?: string;
  readonly baseUrl: string;
}

/**
 * Sesiones de checkout por pasarela (`mercadopago`/`getnet`/`stripe`).
 * Retorna el objeto tal cual del orquestador legacy
 * (`{ success, redirectUrl, orderId }`) para no cambiar el contrato HTTP.
 */
export interface CheckoutSessions {
  createSession(
    gateway: string,
    paymentConfig: Record<string, unknown>,
    params: CheckoutSessionParams,
  ): Promise<Record<string, unknown>>;
}

/** Setup de billing del tutor (Stripe Checkout `setup`, legacy tal cual). */
export interface BillingSetup {
  createSetup(
    userId: string,
    email: string,
    baseUrl: string,
  ): Promise<{ url?: string | null; customerId?: string }>;
}
