import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { activateTrial } from '@/services/subscriptions/subscription-engine';

export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { planId, userId, email, firstName, lastName, paymentMethodId, isUpgrade, upgradePrice } = await req.json();

    if (!planId || !email) {
      return NextResponse.json({ error: 'Plan ID y Email son obligatorios' }, { status: 400 });
    }

    // 1. Obtener datos del plan
    const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json({ error: 'El plan no existe' }, { status: 404 });
    }
    const plan = planDoc.data()!;

    // 1.1 VALIDACIÓN DE DOWNGRADE
    if (userId && userId !== 'new_mentor' && userId !== 'temp_lead') {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData?.subscription?.status === 'active' && userData?.subscription?.planId) {
        const currentPlanDoc = await db.collection('subscriptionPlans').doc(userData.subscription.planId).get();
        if (currentPlanDoc.exists) {
          const currentPlan = currentPlanDoc.data()!;
          if (Number(plan.price) < Number(currentPlan.price) && plan.type !== 'free') {
            return NextResponse.json({ 
              error: 'No es posible bajar de plan hasta que finalice la vigencia de tu suscripción actual.' 
            }, { status: 400 });
          }
        }
      }
    }

    const finalPrice = isUpgrade && upgradePrice !== undefined ? upgradePrice : Number(plan.price);

    // 1.2 CASO ESPECIAL: PLAN GRATUITO
    if (finalPrice === 0 && !isUpgrade) {
      if (userId) {
        await activateTrial(userId, planId);
      }
      return NextResponse.json({ success: true, message: 'Plan activado correctamente' });
    }

    // 1.3 CASO: EL PLAN TIENE TRIAL — Activar sin cobrar ahora
    const trialDays = plan.trialDays ?? 0;
    if (trialDays > 0 && !isUpgrade && userId) {
      // Verificar que el tutor tenga al menos un método de pago si el plan lo requiere
      if (plan.requiresPaymentMethod !== false) {
        const methodsSnap = await db.collection('users').doc(userId).collection('paymentMethods')
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (methodsSnap.empty) {
          return NextResponse.json({
            error: 'required_payment_method',
            message: 'Este plan requiere que cargues un medio de pago antes de activar el trial. Podrás usarlo gratuitamente durante el período de prueba.',
          }, { status: 412 });
        }
      }

      // Activar el trial en el motor de suscripciones
      const { trialDays: days, trialEndsAt } = await activateTrial(userId, planId);

      return NextResponse.json({
        success: true,
        trial: true,
        trialDays: days,
        trialEndsAt: trialEndsAt.toISOString(),
        message: `¡Bienvenido! Tu período de prueba gratuita de ${days} días comenzó ahora. No se realizará ningún cobro hasta el ${trialEndsAt.toLocaleDateString('es-AR')}.`,
      });
    }

    // 2. COBRO INMEDIATO: Obtener credenciales del método de pago del sistema
    let paymentMethod;
    if (paymentMethodId) {
      const methodDoc = await db.collection('systemPaymentMethods').doc(paymentMethodId).get();
      paymentMethod = methodDoc.exists ? methodDoc.data() : null;
    } else {
      const methodsSnapshot = await db.collection('systemPaymentMethods')
        .where('isActive', '==', true)
        .limit(1)
        .get();
      paymentMethod = !methodsSnapshot.empty ? methodsSnapshot.docs[0].data() : null;
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'No hay métodos de pago configurados' }, { status: 500 });
    }

    // 3. Procesar según el tipo de pasarela
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

      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://FastoriaAcademy.ai';
      const body = {
        items: [{
          id: planId,
          title: isUpgrade ? `Upgrade FastoriaAcademy: ${plan.name}` : `Suscripción FastoriaAcademy: ${plan.name}`,
          quantity: 1,
          unit_price: finalPrice,
          currency_id: 'ARS'
        }],
        payer: { email, name: firstName, surname: lastName },
        external_reference: externalReference,
        back_urls: {
          success: `${origin}/dashboard?payment=success`,
          failure: `${origin}/dashboard/plan?payment=failure`,
          pending: `${origin}/dashboard/plan?payment=pending`
        },
        auto_return: 'approved' as const,
        notification_url: `${origin}/api/webhooks/mercadopago`
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
