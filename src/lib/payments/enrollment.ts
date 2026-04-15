import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Procesa una inscripción exitosa de forma atómica e idempotente.
 * Puede ser llamada desde el Webhook (asíncrono) o desde el Redirect (síncrono).
 */
export async function processSuccessfulEnrollment({
  paymentId,
  externalReference,
  status
}: {
  paymentId: string;
  externalReference: string;
  status: string;
}) {
  const db = getAdminFirestore();

  if (status !== 'approved') {
    console.log(`[Enrollment] Pago ${paymentId} no aprobado (Status: ${status}).`);
    return { success: false, reason: 'not_approved' };
  }

  try {
    const { pageId, studentEmail, mentorId } = JSON.parse(externalReference);
    const normalizedEmail = studentEmail.toLowerCase().trim();

    console.log(`[Enrollment] Procesando inscripción: ${normalizedEmail} -> Page: ${pageId}`);

    // 1. Obtener la Sales Page para saber el courseId
    const pageSnap = await db.collection('salesPages').doc(pageId).get();
    if (!pageSnap.exists) {
      throw new Error(`SalesPage ${pageId} no encontrada`);
    }
    
    const { courseId } = pageSnap.data() || {};
    if (!courseId) {
      throw new Error(`Página ${pageId} no tiene un courseId asociado`);
    }

    // 2. Verificar existencia previa (Idempotencia)
    const enrollmentId = `enroll_${courseId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
    const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
    const existingSnap = await enrollmentRef.get();

    if (existingSnap.exists) {
      console.log(`[Enrollment] El alumno ${normalizedEmail} ya está inscrito en ${courseId}.`);
      return { success: true, alreadyEnrolled: true, enrollmentId };
    }

    // 3. Crear Inscripción
    const enrollmentData = {
      id: enrollmentId,
      courseId,
      mentorId,
      inviteEmail: normalizedEmail,
      studentId: '', // Se vinculará cuando el alumno haga login con este email
      status: 'active',
      enrolledAt: FieldValue.serverTimestamp(),
      paymentId: paymentId,
      source: 'mercadopago',
      progress: { completedModules: [] },
      metadata: {
        pageId,
        externalReference
      }
    };

    await enrollmentRef.set(enrollmentData);

    // 4. Actualizar estadísticas de la página de forma atómica
    await db.collection('salesPages').doc(pageId).update({
      'stats.conversions': FieldValue.increment(1),
      'stats.lastSaleAt': FieldValue.serverTimestamp()
    });

    console.log(`[Enrollment] ÉXITO: Alumno ${normalizedEmail} inscrito en curso ${courseId}`);
    return { success: true, enrollmentId };

  } catch (error: any) {
    console.error('[Enrollment Error]', error);
    throw error;
  }
}
