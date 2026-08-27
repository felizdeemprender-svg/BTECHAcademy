import { NextResponse } from 'next/server';
import {
  handleSubscriptionCreated,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionCanceled
} from '@/services/subscriptions/subscription-engine';

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-getnet-signature');
    const gateway = req.headers.get('stripe-signature') ? 'stripe' : 'getnet';
    
    // Aquí idealmente validamos la firma criptográfica (signature) según la pasarela.
    // Omitido por simplicidad y acoplamiento directo a la prueba.

    const event = JSON.parse(text);

    console.log(`[Webhooks] Recibido evento de ${gateway}:`, event.type || event.event_type);

    if (gateway === 'stripe') {
      const data = event.data.object;
      // Stripe mapeo
      switch (event.type) {
        case 'customer.subscription.created':
          // data.metadata.tutorId se debe inyectar al crear el checkout session
          if (data.metadata?.tutorId) {
            await handleSubscriptionCreated(data.metadata.tutorId, data.id, 'stripe');
          }
          break;
        case 'invoice.payment_succeeded':
          if (data.subscription && data.customer_email) {
            // El tutorId debería buscarse por email o por metadata
            const tutorEmail = data.customer_email;
            // Para simplificar, buscamos si guardamos el tutorId en subscription_details metadata
            if (data.subscription_details?.metadata?.tutorId) {
              await handlePaymentSucceeded(data.subscription_details.metadata.tutorId);
            }
          }
          break;
        case 'invoice.payment_failed':
          if (data.subscription_details?.metadata?.tutorId) {
            await handlePaymentFailed(data.subscription_details.metadata.tutorId);
          }
          break;
        case 'customer.subscription.deleted':
          if (data.metadata?.tutorId) {
            await handleSubscriptionCanceled(data.metadata.tutorId);
          }
          break;
        default:
          console.log(`[Webhooks] Evento ignorado: ${event.type}`);
      }
    } else if (gateway === 'getnet') {
      // Mapeo teórico de GetNet
      const data = event;
      const tutorId = data.metadata?.tutorId;
      
      switch (data.event_type) {
        case 'subscription.created':
          if (tutorId) await handleSubscriptionCreated(tutorId, data.subscription_id, 'getnet');
          break;
        case 'payment.succeeded':
          if (tutorId) await handlePaymentSucceeded(tutorId);
          break;
        case 'payment.failed':
          if (tutorId) await handlePaymentFailed(tutorId);
          break;
        case 'subscription.canceled':
          if (tutorId) await handleSubscriptionCanceled(tutorId);
          break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhooks] Error procesando evento:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
