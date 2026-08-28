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

import Stripe from 'stripe';

const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_for_build', {
  apiVersion: '2026-07-29.dahlia' as any, // Ignorar error de ts
});

/**
 * Genera una sesión de SetupIntent para que el tutor guarde su tarjeta
 * al momento de elegir su plan (para cobros post-pagos BYOG).
 */
export async function setupTutorBilling(tutorId: string, email: string, baseUrl: string) {
  // 1. Verificar si ya tiene Customer ID en Firestore (se omite DB aquí, se asume pasado o buscar)
  // En un flujo real, buscarías en firestore si el tutor ya tiene stripeCustomerId.
  // Aquí creamos uno temporalmente o asumimos que lo creamos on the fly.
  
  if ((process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_for_build').startsWith('sk_test_dummy')) {
    // Si estamos en desarrollo sin una llave real, simulamos el éxito para no bloquear la UI
    return { url: `${baseUrl}/admin/billing?success=true&session_id=mock_session_123`, customerId: 'cus_mock123' };
  }

  const customer = await platformStripe.customers.create({
    email: email,
    metadata: { tutorId },
  });

  const session = await platformStripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'setup',
    customer: customer.id,
    success_url: `${baseUrl}/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/admin/billing?canceled=true`,
  });

  return { url: session.url, customerId: customer.id };
}

/**
 * Cobra el abono mensual + regalías usando la tarjeta guardada del tutor.
 */
export async function chargeTutorMonthlyBill(customerId: string, amount: number, currency: string = 'usd', description: string) {
  try {
    const paymentIntent = await platformStripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency,
      customer: customerId,
      description,
      confirm: true,
      off_session: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });
    return { success: true, paymentIntent };
  } catch (error: any) {
    console.error('Error charging tutor bill:', error);
    return { success: false, error: error.message };
  }
}
