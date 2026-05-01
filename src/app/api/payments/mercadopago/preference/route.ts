import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { pageId, studentEmail, studentName } = await req.json();

    if (!pageId) {
      return NextResponse.json({ error: 'El ID de la página es obligatorio' }, { status: 400 });
    }

    // 1. Obtener la Sales Page
    const pageSnap = await db.collection('salesPages').doc(pageId).get();

    if (!pageSnap.exists) {
      return NextResponse.json({ error: 'Página de venta no encontrada' }, { status: 404 });
    }

    const pageData = pageSnap.data() || {};
    const mentorId = pageData.mentorId;
    const price = pageData.price || 0;
    const title = pageData.title || 'Inscripción a Programa';

    if (!mentorId) {
      return NextResponse.json({ error: 'No se encontró un mentor para esta página' }, { status: 404 });
    }

    // 2. Obtener Credenciales del Mentor
    const mentorSnap = await db.collection('users').doc(mentorId).get();

    if (!mentorSnap.exists) {
      return NextResponse.json({ error: 'Perfil del mentor no encontrado' }, { status: 404 });
    }

    const mentorData = mentorSnap.data() || {};
    
    // 2.1 Intentar obtener de la nueva arquitectura (Colección paymentMethods)
    const methodsSnap = await db.collection('users').doc(mentorId).collection('paymentMethods')
      .where('type', '==', 'mercadopago')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    let mpAccessToken = null;
    if (!methodsSnap.empty) {
      mpAccessToken = methodsSnap.docs[0].data().config?.accessToken;
    }

    // 2.2 Fallback: arquitectura antigua (Legacy)
    if (!mpAccessToken) {
      mpAccessToken = mentorData.profile?.mercadopago?.accessToken;
    }

    if (!mpAccessToken) {
      return NextResponse.json({ 
        error: 'El mentor no ha configurado MercadoPago',
        message: 'El tutor no ha cargado sus credenciales de cobro en su central de pagos.'
      }, { status: 412 });
    }

    // 3. Configurar MercadoPago con el token del Mentor
    const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(mpClient);

    // 4. Mapeo de Seguridad (Para el Webhook)
    // Obtenemos el ID de usuario de Mercado Pago del Mentor para que el Webhook pueda identificarlo
    try {
      const mpUserRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` }
      });
      if (mpUserRes.ok) {
        const mpUser = await mpUserRes.json();
        const mpSellerId = String(mpUser.id);
        
        await db.collection('mp_seller_mappings').doc(mpSellerId).set({
          mentorId,
          lastActive: new Date().toISOString(),
          nickname: mpUser.nickname
        }, { merge: true });
        
        console.log(`[MercadoPago] Mapeo actualizado para Mentor ${mentorId} (MP ID: ${mpSellerId})`);
      }
    } catch (e) {
      console.error('[MercadoPago] Error al mapear el Seller ID del mentor:', e);
    }

    // 4. Crear la Preferencia
    const origin = req.nextUrl.origin;
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');

    const externalReference = JSON.stringify({
      pageId,
      studentEmail: studentEmail || 'guest',
      mentorId
    });

    const body: any = {
      items: [
        {
          id: pageId,
          title: title,
          quantity: 1,
          unit_price: Number(price),
          currency_id: 'ARS'
        }
      ],
      payer: {
        email: studentEmail || undefined,
        name: studentName || undefined
      },
      back_urls: {
        success: `${origin}/api/payments/mercadopago/webhook?status=approved`,
        failure: `${origin}/v/${pageId}?status=failure`,
        pending: `${origin}/v/${pageId}?status=pending`
      },
      external_reference: externalReference,
      statement_descriptor: 'BTECH ACADEMY',
      expires: false
    };

    // MercadoPago no permite auto_return ni notification_url con localhost en producción
    if (!isLocal) {
      console.log('[MercadoPago] Entorno de producción detectado. Activando auto_return y webhooks.');
      body.auto_return = 'approved';
      body.notification_url = `${origin}/api/payments/mercadopago/webhook`;
    } else {
      console.log('[MercadoPago] Entorno local detectado. Desactivando retorno automático para evitar errores de validación.');
    }

    console.log('[MercadoPago] Cuerpo final de la preferencia:', JSON.stringify(body, null, 2));

    const response = await preference.create({ body });

    return NextResponse.json({ 
      id: response.id, 
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point 
    });

  } catch (error: any) {
    console.error('Error en Preferencia MercadoPago:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error.message,
      stack: error.stack,
      env_detect: {
        has_fb_config: !!process.env.FIREBASE_CONFIG,
        has_admin_project: !!process.env.FB_ADMIN_PROJECT_ID,
        node_env: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
