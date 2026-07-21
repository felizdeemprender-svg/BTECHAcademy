import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { createMercadoPagoSession } from '@/services/payments/mercadopago';
import { createGetnetSession } from '@/services/payments/getnet';

export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { pageId, studentEmail, studentName, referidoId, gateway = 'mercadopago' } = await req.json();

    if (!pageId || !studentEmail) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Obtener la Landing Page (Curso)
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

    // 2. Buscar Credenciales del Mentor para la Pasarela Elegida
    const methodsSnap = await db.collection('users').doc(mentorId).collection('paymentMethods')
      .where('type', '==', gateway)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    let paymentConfig = null;
    if (!methodsSnap.empty) {
      paymentConfig = methodsSnap.docs[0].data().config;
    }

    // 2.1 Fallback para Mercado Pago (Arquitectura Legacy)
    if (!paymentConfig && gateway === 'mercadopago') {
      const mentorSnap = await db.collection('users').doc(mentorId).get();
      const legacyMP = mentorSnap.data()?.profile?.mercadopago;
      if (legacyMP?.accessToken) {
        paymentConfig = legacyMP;
      }
    }

    if (!paymentConfig) {
      return NextResponse.json({ 
        error: `El tutor no ha configurado ${gateway.toUpperCase()}`,
        message: 'El tutor no ha cargado sus credenciales de cobro en su central de pagos.'
      }, { status: 412 });
    }

    // 3. Preparar Variables Base
    const origin = req.nextUrl.origin;
    const baseUrl = req.headers.get('x-forwarded-proto') 
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}` 
      : origin;

    // 4. Factory / Orquestador: Derivar a la Pasarela Correspondiente
    if (gateway === 'mercadopago') {
      const mpResult = await createMercadoPagoSession({
        pageId,
        title,
        price,
        studentEmail,
        studentName,
        mentorId,
        referidoId,
        mpAccessToken: paymentConfig.accessToken,
        baseUrl
      });
      return NextResponse.json(mpResult);

    } else if (gateway === 'getnet') {
      const getnetResult = await createGetnetSession({
        pageId,
        title,
        price,
        studentEmail,
        studentName,
        mentorId,
        clientId: paymentConfig.clientId,
        clientSecret: paymentConfig.clientSecret,
        sellerId: paymentConfig.sellerId,
        baseUrl
      });
      return NextResponse.json(getnetResult);

    } else {
      return NextResponse.json({ error: `Pasarela ${gateway} no soportada.` }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`[Checkout Orchestrator] Error:`, error);
    return NextResponse.json({ 
      error: 'Error interno procesando el checkout', 
      details: error.message 
    }, { status: 500 });
  }
}
