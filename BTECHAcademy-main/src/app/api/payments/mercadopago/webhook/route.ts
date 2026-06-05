import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';
import { MercadoPagoConfig, Payment } from 'mercadopago';

/**
 * WEBHOOK: Procesamiento Asincrónico de Pagos
 * Este endpoint es llamado por Mercado Pago cuando un pago cambia de estado.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const body = await req.json();
    
    // Mercado Pago envía notificaciones de varios tipos. Nos interesan 'payment'.
    const topic = body.type || body.topic;
    const paymentId = body.data?.id || body.id;
    const sellerId = String(body.user_id);

    console.log(`[Webhook MP] Recibida notificación: ${topic} ID: ${paymentId} (Seller: ${sellerId})`);

    if (topic !== 'payment') {
      return NextResponse.json({ received: true });
    }

    // 1. Identificar al Mentor usando el mapeo de Seller ID
    const mappingSnap = await db.collection('mp_seller_mappings').doc(sellerId).get();
    if (!mappingSnap.exists) {
      console.warn(`[Webhook MP] No se encontró un mentor vinculado al Seller ID: ${sellerId}`);
      return NextResponse.json({ error: 'Mentor mapping not found' }, { status: 404 });
    }

    const { mentorId } = mappingSnap.data() as any;

    // 2. Obtener Token del Mentor
    const mentorSnap = await db.collection('users').doc(mentorId).get();
    const mentorData = mentorSnap.data() as any;
    const mpAccessToken = mentorData?.profile?.mercadopago?.accessToken;

    if (!mpAccessToken) {
      console.error(`[Webhook MP] El mentor ${mentorId} no tiene Access Token configurado.`);
      return NextResponse.json({ error: 'Mentor token missing' }, { status: 500 });
    }

    // 3. Consultar detalles del pago a la API de Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    if (!paymentData || !paymentData.external_reference) {
      console.warn(`[Webhook MP] Pago ${paymentId} no tiene external_reference.`);
      return NextResponse.json({ received: true });
    }

    // 4. Ejecutar Inscripción
    const result = await processSuccessfulEnrollment({
      paymentId: String(paymentId),
      externalReference: paymentData.external_reference,
      status: paymentData.status || 'pending'
    });

    return NextResponse.json({ processed: true, ...result });

  } catch (error: any) {
    console.error('[Webhook MP Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * REDIRECT (Success URL): Procesamiento Sincrónico (Fallback)
 * Este endpoint es llamado cuando el usuario vuelve a la web tras el pago.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    console.log(`[Redirect MP] Usuario regresó con estado: ${status}`);

    if (status === 'approved' && externalReference) {
      try {
        await processSuccessfulEnrollment({
          paymentId: paymentId || 'manual_redirect',
          externalReference,
          status
        });
        // Redirigir a la página de éxito o dashboard
        return NextResponse.redirect(`${origin}/dashboard/my-courses?enrolled=true`);
      } catch (e) {
        console.error('[Redirect MP] Error al procesar inscripción:', e);
      }
    }

    // Fallback por defecto
    return NextResponse.redirect(`${origin}/dashboard/my-courses`);
  } catch (error: any) {
    console.error('[Redirect MP Error]', error);
    return NextResponse.redirect(`${new URL(req.url).origin}/dashboard/my-courses?error=system_error`);
  }
}
