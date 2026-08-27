import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const tutorId = decodedToken.uid;

    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(tutorId).get();
    const user = userDoc.data();
    
    if (!user || !user.subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const { gateway, gatewaySubscriptionId } = user.subscription;

    if (!gatewaySubscriptionId) {
      // Si no hay ID de pasarela, solo la cancelamos internamente
      await db.collection('users').doc(tutorId).update({
        'subscription.status': 'canceled',
        'subscription.canceledAt': new Date()
      });
      return NextResponse.json({ success: true, message: 'Cancelada localmente (sin pasarela)' });
    }

    // Aquí iría el llamado a la API real de la pasarela para cancelar
    if (gateway === 'stripe') {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
        await stripe.subscriptions.cancel(gatewaySubscriptionId);
        console.log(`[Cancel API] Cancelando suscripción en Stripe: ${gatewaySubscriptionId}`);
      } catch (error: any) {
        console.error(`[Cancel API] Falló cancelación en Stripe:`, error.message);
      }
    } else if (gateway === 'getnet') {
      console.log(`[Cancel API] Cancelación en GetNet delegada manualmente: ${gatewaySubscriptionId}`);
    }

    // Actualizamos el estado interno a cancelado. En un entorno real,
    // podríamos mantenerla activa hasta nextBillingAt marcando cancelAtPeriodEnd = true.
    await db.collection('users').doc(tutorId).update({
      'subscription.status': 'canceled',
      'subscription.canceledAt': new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Cancel Subscription] Error:', error);
    return NextResponse.json({ error: 'Fallo interno al cancelar suscripción' }, { status: 500 });
  }
}
