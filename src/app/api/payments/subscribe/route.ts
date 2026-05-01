import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  try {
    const { planId, userId, email, firstName, lastName, paymentMethodId, isUpgrade, upgradePrice } = await req.json();

    if (!planId || !email) {
      return NextResponse.json({ error: 'Plan ID y Email son obligatorios' }, { status: 400 });
    }

    // 1. Obtener datos del plan
    const planDoc = await adminDb.collection('subscriptionPlans').doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json({ error: 'El plan no existe' }, { status: 404 });
    }
    const plan = planDoc.data();

    // 1.2 VALIDACIÓN DE DOWNGRADE
    if (userId && userId !== 'new_mentor' && userId !== 'temp_lead') {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData?.subscription?.status === 'active' && userData?.subscription?.planId) {
        const currentPlanDoc = await adminDb.collection('subscriptionPlans').doc(userData.subscription.planId).get();
        if (currentPlanDoc.exists) {
          const currentPlan = currentPlanDoc.data();
          if (Number(plan?.price) < Number(currentPlan?.price) && plan?.type !== 'free') {
            return NextResponse.json({ 
              error: 'No es posible bajar de plan hasta que finalice la vigencia de tu suscripción actual.' 
            }, { status: 400 });
          }
        }
      }
    }

    const finalPrice = isUpgrade && upgradePrice !== undefined ? upgradePrice : Number(plan?.price);

    // 1.1 CASO ESPECIAL: PLAN GRATUITO O UPGRADE DE COSTO 0
    if (finalPrice === 0 && !isUpgrade) {
      try {
        const { processSuccessfulSubscription } = await import('@/lib/payments/subscription');
        await processSuccessfulSubscription('free_activation', planId, 'free_activation', {
          userId,
          email,
          displayName: `${firstName} ${lastName}`.trim()
        });
        return NextResponse.json({ success: true, message: 'Plan activado correctamente' });
      } catch (error: any) {
        console.error('[FREE_ACTIVATION_ERROR]:', error);
        return NextResponse.json({ error: `Error en activación: ${error.message}` }, { status: 500 });
      }
    }

    // 2. Obtener credenciales del método de pago
    let paymentMethod;
    if (paymentMethodId) {
      const methodDoc = await adminDb.collection('systemPaymentMethods').doc(paymentMethodId).get();
      paymentMethod = methodDoc.exists ? methodDoc.data() : null;
    } else {
      const methodsSnapshot = await adminDb.collection('systemPaymentMethods')
        .where('isActive', '==', true)
        .limit(1)
        .get();
      paymentMethod = !methodsSnapshot.empty ? methodsSnapshot.docs[0].data() : null;
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'No hay métodos de pago configurados' }, { status: 500 });
    }

    // 3. Procesar según el tipo de pasarela (Mercado Pago)
    if (paymentMethod.type === 'mercadopago') {
      const { accessToken } = paymentMethod.config || {};
      if (!accessToken) return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 500 });

      const client = new MercadoPagoConfig({ accessToken });
      const preference = new Preference(client);

      const externalReference = JSON.stringify({ 
        userId: userId || 'new_mentor', 
        planId,
        isUpgrade,
        leadData: { email, firstName, lastName }
      });

      const body = {
        items: [
          {
            id: planId,
            title: isUpgrade ? `Upgrade BTECHAcademy: ${plan?.name}` : `Suscripción BTECHAcademy: ${plan?.name}`,
            quantity: 1,
            unit_price: finalPrice,
            currency_id: 'USD'
          }
        ],
        payer: {
          email: email,
          name: firstName,
          surname: lastName
        },
        external_reference: externalReference,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/planes?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/planes?payment=pending`
        },
        auto_return: 'approved' as const,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://btechacademy-pro--btechacademy-8b329.us-central1.hosted.app'}/api/webhooks/mercadopago`
      };

      const response = await preference.create({ body });

      return NextResponse.json({ 
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
      });
    }

    return NextResponse.json({ error: 'Método de pago no soportado' }, { status: 400 });

  } catch (error: any) {
    console.error('[API_SUBSCRIBE_ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
