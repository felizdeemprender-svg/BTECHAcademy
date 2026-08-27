import { createMercadoPagoSession } from './mercadopago';
import { createGetnetSession } from './getnet';
import { createStripeSession } from './stripe';

export interface PaymentSessionParams {
  pageId: string;
  title: string;
  price: number;
  studentEmail: string;
  studentName: string;
  mentorId: string;
  baseUrl: string;
  referidoId?: string;
  mode?: 'payment' | 'subscription';
  planId?: string;
  priceId?: string;
  currency?: string;
}

export async function processPaymentSession(gateway: string, paymentConfig: any, params: PaymentSessionParams) {
  if (gateway === 'mercadopago') {
    return await createMercadoPagoSession({
      ...params,
      mpAccessToken: paymentConfig.accessToken,
    });
  } else if (gateway === 'getnet') {
    return await createGetnetSession({
      ...params,
      clientId: paymentConfig.clientId,
      clientSecret: paymentConfig.clientSecret,
      sellerId: paymentConfig.sellerId,
    });
  } else if (gateway === 'stripe') {
    return await createStripeSession({
      ...params,
      stripeSecretKey: paymentConfig.secretKey, // Asumiremos que el tutor guarda 'secretKey' para Stripe
      currency: paymentConfig.currency || 'usd',
    });
  } else {
    throw new Error(`Pasarela de pago no soportada: ${gateway}`);
  }
}
