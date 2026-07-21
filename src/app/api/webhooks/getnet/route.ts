import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[Getnet Webhook] Payload recibido:', payload);

    const status = payload.status; 
    const orderId = payload.order_id;
    const paymentId = payload.payment_id;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID no encontrado en payload' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // 1. Buscar la orden pendiente
    const orderRef = db.collection('pending_orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('[Getnet Webhook] Orden no encontrada:', orderId);
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Si el pago está aprobado
    if (status === 'APPROVED' || status === 'AUTHORIZED') {
      
      // Construir el externalReference simulado para que enrollment.ts lo entienda igual que MP
      const externalReference = JSON.stringify({
        pageId: orderData.landingId,
        studentEmail: orderData.buyerEmail,
        studentName: orderData.buyerName,
        mentorId: orderData.tutorId,
        referidoId: orderData.referidoId || null
      });

      // Llamar al servicio unificado de Enrollment (el mismo de Mercado Pago)
      await processSuccessfulEnrollment({
        paymentId: paymentId || payload.id || orderId,
        externalReference,
        status: 'approved'
      });

      // Marcar orden como completada
      await orderRef.update({
        status: 'completed',
        updatedAt: new Date()
      });

    } else {
      // Registrar que falló o fue cancelada
      await orderRef.update({
        status: status || 'failed',
        updatedAt: new Date(),
        lastPayload: payload
      });
      console.log(`[Getnet Webhook] Orden ${orderId} actualizada con status: ${status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Getnet Webhook Error]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
