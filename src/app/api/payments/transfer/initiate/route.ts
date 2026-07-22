import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendTransferStudentEmail } from '@/lib/emails/transfer-student';
import { sendTransferMentorEmail } from '@/lib/emails/transfer-mentor';

/**
 * POST /api/payments/transfer/initiate
 * Crea una orden de transferencia pendiente y notifica al alumno y al tutor.
 *
 * Body: { pageId, studentEmail, studentName, referidoId? }
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { pageId, studentEmail, studentName, referidoId } = await req.json();

    if (!pageId || !studentEmail) {
      return NextResponse.json(
        { error: 'pageId y studentEmail son obligatorios' },
        { status: 400 }
      );
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();

    // 1. Obtener la Sales Page
    const pageSnap = await db.collection('salesPages').doc(pageId).get();
    if (!pageSnap.exists) {
      return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
    }
    const pageData = pageSnap.data() || {};
    const mentorId = pageData.mentorId;
    const price = pageData.price || 0;
    const pageTitle = pageData.title || 'Curso';

    if (!mentorId) {
      return NextResponse.json({ error: 'Página sin mentor asignado' }, { status: 404 });
    }

    // 2. Obtener datos bancarios del método de transferencia activo del mentor
    const methodsSnap = await db
      .collection('users')
      .doc(mentorId)
      .collection('paymentMethods')
      .where('type', '==', 'transfer')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (methodsSnap.empty) {
      return NextResponse.json(
        { error: 'El tutor no tiene un método de transferencia activo configurado.' },
        { status: 412 }
      );
    }

    const bankMethod = methodsSnap.docs[0].data();
    const bankDetails = {
      alias: bankMethod.config?.alias || '',
      cbu: bankMethod.config?.cbu || '',
      bankName: bankMethod.config?.bankName || '',
      titularName: bankMethod.config?.titularName || '',
    };

    // 3. Obtener datos del mentor para el email
    const mentorSnap = await db.collection('users').doc(mentorId).get();
    const mentorData = mentorSnap.data() || {};
    const mentorEmail = mentorData.email || '';
    const mentorName = mentorData.displayName || 'Tu tutor';

    // 4. Crear la orden de transferencia pendiente
    const orderId = `txfr_${pageId.substring(0, 6)}_${Date.now()}`;
    const referenceCode = `${normalizedEmail.split('@')[0].toUpperCase()}-${orderId.slice(-6).toUpperCase()}`;

    const orderData = {
      id: orderId,
      pageId,
      pageTitle,
      mentorId,
      mentorEmail,
      studentEmail: normalizedEmail,
      studentName: studentName || normalizedEmail.split('@')[0],
      amount: price,
      bankDetails,
      referenceCode,
      referidoId: referidoId || null,
      status: 'pending', // pending | approved | rejected
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('transferOrders').doc(orderId).set(orderData);

    // 5. Enviar emails de notificación
    try {
      await sendTransferStudentEmail({
        studentEmail: normalizedEmail,
        studentName: orderData.studentName,
        courseTitle: pageTitle,
        amount: price,
        bankDetails,
        referenceCode,
        mentorName,
        mentorEmail
      });

      await sendTransferMentorEmail({
        mentorEmail,
        mentorName,
        studentName: orderData.studentName,
        studentEmail: normalizedEmail,
        courseTitle: pageTitle,
        amount: price,
        referenceCode,
      });
    } catch (emailErr) {
      console.error('[TransferInitiate] Error al enviar emails (no crítico):', emailErr);
    }

    return NextResponse.json({
      success: true,
      orderId,
      referenceCode,
      bankDetails,
      amount: price,
    });
  } catch (error: any) {
    console.error('[TransferInitiate] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
