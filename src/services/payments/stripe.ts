import Stripe from 'stripe';
import { PaymentSessionParams } from './orchestrator';

interface StripeSessionParams extends PaymentSessionParams {
  stripeSecretKey: string;
}

export async function createStripeSession(params: StripeSessionParams) {
  if (!params.stripeSecretKey) {
    throw new Error('Falta stripeSecretKey para inicializar Stripe');
  }

  const stripe = new Stripe(params.stripeSecretKey, {
    apiVersion: '2024-06-20' as any // Use an older stable version if acacia gives type errors, or just suppress it.
  });

  const isSubscription = params.mode === 'subscription';

  try {
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${params.baseUrl}/s/${params.pageId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.baseUrl}/s/${params.pageId}?canceled=true`,
      customer_email: params.studentEmail,
      client_reference_id: params.referidoId ? `${params.pageId}_${params.referidoId}` : params.pageId,
      metadata: {
        mentorId: params.mentorId,
        studentName: params.studentName,
        studentEmail: params.studentEmail,
        pageId: params.pageId,
        referidoId: params.referidoId || '',
        isSubscription: isSubscription ? 'true' : 'false',
        planId: params.planId || '',
      }
    };

    if (isSubscription) {
      if (!params.priceId) {
        throw new Error('Para suscripciones en Stripe se requiere un priceId pre-creado en el Dashboard del tutor.');
      }
      sessionConfig.line_items = [
        {
          price: params.priceId,
          quantity: 1,
        }
      ];
    } else {
      sessionConfig.line_items = [
        {
          price_data: {
            currency: params.currency || 'usd',
            product_data: {
              name: params.title,
              description: `Acceso al curso/mentoría ${params.title}`,
            },
            unit_amount: Math.round(params.price * 100), // Stripe usa centavos
          },
          quantity: 1,
        }
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      id: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('[Stripe] Error al crear sesión de checkout:', error);
    throw error;
  }
}
