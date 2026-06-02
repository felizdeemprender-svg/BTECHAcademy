import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';

/**
 * POST /api/payments/transfer/approve
 * Aprueba o rechaza una orden de transferencia pendiente.
 * Solo puede ejecutarlo el mentor dueño de la orden (verificado por mentorId en el body).
 *
 * Body: { orderId, action: 'approve' | 'reject', mentorId }
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { orderId, action, mentorId } = await req.json();

    if (!orderId || !action || !mentorId) {
      return NextResponse.json(
        { error: 'orderId, action y mentorId son obligatorios' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action debe ser approve o reject' }, { status: 400 });
    }

    // 1. Obtener la orden
    const orderRef = db.collection('transferOrders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const order = orderSnap.data()!;

    // 2. Verificar que el mentor es el dueño
    if (order.mentorId !== mentorId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Verificar que no fue ya procesada
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Esta orden ya fue procesada (estado: ${order.status})` },
        { status: 409 }
      );
    }

    if (action === 'reject') {
      await orderRef.update({
        status: 'rejected',
        updatedAt: FieldValue.serverTimestamp(),
        rejectedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // action === 'approve'
    // 4. Usar el mismo flujo de inscripción que MercadoPago
    const externalReference = JSON.stringify({
      pageId: order.pageId,
      studentEmail: order.studentEmail,
      studentName: order.studentName,
      mentorId: order.mentorId,
      referidoId: order.referidoId || null,
    });

    const result = await processSuccessfulEnrollment({
      paymentId: orderId,
      externalReference,
      status: 'approved',
    });

    // 5. Actualizar estado de la orden
    await orderRef.update({
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
      approvedAt: FieldValue.serverTimestamp(),
      enrollmentId: result.enrollmentId || null,
    });

    return NextResponse.json({ success: true, status: 'approved', enrollmentId: result.enrollmentId });
  } catch (error: any) {
    console.error('[TransferApprove] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
