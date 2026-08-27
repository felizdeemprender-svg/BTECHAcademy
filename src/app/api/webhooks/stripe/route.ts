import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminFirestore } from '@/firebase/admin';
import {
  handleSubscriptionCreated,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionCanceled
} from '@/services/subscriptions/subscription-engine';

export async function POST(req: Request) {
  const db = getAdminFirestore();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Falta stripe-signature header' }, { status: 400 });
    }

    const eventUnverified = JSON.parse(rawBody);
    const mentorId = eventUnverified?.data?.object?.metadata?.mentorId;

    let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    // Instanciamos Stripe con cualquier key válida para parsear.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2024-06-20' as any });
    
    let event: Stripe.Event;
    
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        event = eventUnverified; // Fallback si no hay secret configurado (desarrollo)
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Error verificando firma: ${err.message}`);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Recibido evento: ${event.type}`);

    // Manejo de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        
        // Es una suscripción comprada?
        if (session.mode === 'subscription' && session.subscription && meta.mentorId) {
           const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
           await handleSubscriptionCreated(meta.mentorId, subId, 'stripe');
        }
        break;
      }
      
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        // Si el pago es exitoso, actualizamos
        if (invoice.subscription) {
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
          // Buscar qué tutor tiene este subId
          const usersSnap = await db.collection('users').where('subscription.gatewaySubscriptionId', '==', subId).get();
          if (!usersSnap.empty) {
             const tutorId = usersSnap.docs[0].id;
             // nextBillingDate podría venir de invoice.lines.data[0].period.end
             const nextBillingDate = new Date((invoice.lines?.data?.[0]?.period?.end || (Date.now() / 1000 + 2592000)) * 1000);
             await handlePaymentSucceeded(tutorId, nextBillingDate);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
          const usersSnap = await db.collection('users').where('subscription.gatewaySubscriptionId', '==', subId).get();
          if (!usersSnap.empty) {
             const tutorId = usersSnap.docs[0].id;
             await handlePaymentFailed(tutorId);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const usersSnap = await db.collection('users').where('subscription.gatewaySubscriptionId', '==', subscription.id).get();
        if (!usersSnap.empty) {
            const tutorId = usersSnap.docs[0].id;
            await handleSubscriptionCanceled(tutorId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error crítico:', error);
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 });
  }
}
