import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';
import { processSuccessfulSubscription } from '@/lib/payments/subscription';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || (await req.json()).type;
    const dataId = searchParams.get('data.id') || (await req.json()).data?.id;

    console.log(`[MP_WEBHOOK] Notificación recibida: ${type} - ID: ${dataId}`);

    if (type === 'payment' && dataId) {
      // 1. Obtener credenciales de Mercado Pago (necesitamos el Access Token para validar)
      const mpMethodsSnapshot = await adminDb.collection('systemPaymentMethods')
        .where('type', '==', 'mercadopago')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (mpMethodsSnapshot.empty) {
        throw new Error('No hay métodos de pago configurados para validar el webhook');
      }

      const mpConfig = mpMethodsSnapshot.docs[0].data();
      const client = new MercadoPagoConfig({ accessToken: mpConfig.config.accessToken });
      const payment = new Payment(client);

      // 2. Obtener detalles del pago desde MP
      const paymentData = await payment.get({ id: dataId });
      const { status, external_reference, id: paymentId } = paymentData;

      if (!external_reference) {
        console.warn(`[MP_WEBHOOK] Pago ${paymentId} no tiene external_reference. Ignorando.`);
        return NextResponse.json({ received: true });
      }

      const refData = JSON.parse(external_reference);
      const { userId, planId, leadData, isUpgrade } = refData;

      // 3. Determinar si es Suscripción (Tutor) o Inscripción (Alumno)
      if (planId) {
        // ES UNA SUSCRIPCIÓN DE TUTOR
        console.log(`[MP_WEBHOOK] Detectada Suscripción de Tutor para el pago ${paymentId} (Upgrade: ${!!isUpgrade})`);
        await processSuccessfulSubscription(
          String(paymentId),
          planId,
          status || 'unknown',
          {
            userId,
            email: leadData?.email || paymentData.payer?.email,
            displayName: leadData ? `${leadData.firstName} ${leadData.lastName}` : ''
          },
          !!isUpgrade
        );
      } else if (refData.pageId) {
        // ES UNA INSCRIPCIÓN DE ALUMNO A UN CURSO
        console.log(`[MP_WEBHOOK] Detectada Inscripción de Alumno para el pago ${paymentId}`);
        await processSuccessfulEnrollment({
          paymentId: String(paymentId),
          externalReference: external_reference,
          status: status || 'unknown'
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[MP_WEBHOOK_ERROR]:', error);
    // Respondemos 200 de todos modos para que MP no reintente infinitamente si es un error de lógica
    return NextResponse.json({ received: true, error: error.message });
  }
}
