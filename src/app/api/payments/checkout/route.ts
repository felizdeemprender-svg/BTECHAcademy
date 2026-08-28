import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
export const dynamic = 'force-dynamic';
import { processPaymentSession } from '@/services/payments/orchestrator';

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
    const result = await processPaymentSession(gateway, paymentConfig, {
      pageId,
      title,
      price,
      studentEmail,
      studentName,
      mentorId,
      referidoId,
      baseUrl
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[Checkout Orchestrator] Error:`, error);
    return NextResponse.json({ 
      error: 'Error interno procesando el checkout', 
      details: error.message 
    }, { status: 500 });
  }
}
