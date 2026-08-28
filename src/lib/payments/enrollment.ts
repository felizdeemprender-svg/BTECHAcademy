import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendWelcomeEmailServer } from '@/lib/emails/welcome';

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
    const { pageId, studentEmail, mentorId, referidoId } = JSON.parse(externalReference);
    const normalizedEmail = studentEmail.toLowerCase().trim();

    console.log(`[Enrollment] Procesando inscripción: ${normalizedEmail} -> Page: ${pageId}`);

    // 1. Obtener la Sales Page para saber el courseId / productId
    const pageSnap = await db.collection('salesPages').doc(pageId).get();
    if (!pageSnap.exists) {
      throw new Error(`SalesPage ${pageId} no encontrada`);
    }
    
    const pageData = pageSnap.data() || {};
    const productId = pageData.productId || pageData.courseId;
    const productType = pageData.productType || 'course';

    if (!productId) {
      throw new Error(`Página ${pageId} no tiene un producto asociado`);
    }

    // 2. Verificar existencia previa (Idempotencia)
    const enrollmentId = `enroll_${productId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
    const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
    const existingSnap = await enrollmentRef.get();

    if (existingSnap.exists) {
      console.log(`[Enrollment] El alumno ${normalizedEmail} ya está inscrito en ${productId}.`);
      return { success: true, alreadyEnrolled: true, enrollmentId };
    }

    // 3. Obtener o crear al estudiante en la colección 'users'
    let studentId = '';
    let studentName = normalizedEmail.split('@')[0];
    const userQuery = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    
    if (!userQuery.empty) {
      studentId = userQuery.docs[0].id;
      studentName = userQuery.docs[0].data().displayName || studentName;
    } else {
      // Crear un perfil provisional para que el usuario ya figure de alta
      const tempId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      studentId = tempId;
      await db.collection('users').doc(tempId).set({
        email: normalizedEmail,
        displayName: studentName,
        roles: ['alumno'],
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        createdVia: 'auto_enrollment'
      });
    }

    // 4. Crear Inscripción
    const enrollmentData = {
      id: enrollmentId,
      courseId: productId, // Por retrocompatibilidad de la UI de alumnos
      productId: productId,
      productType: productType,
      mentorId,
      inviteEmail: normalizedEmail,
      studentId: studentId,
      status: 'active',
      enrolledAt: FieldValue.serverTimestamp(),
      paymentId: paymentId,
      source: 'mercadopago',
      progress: { completedModules: [] },
      progressPercent: 0,
      metadata: {
        pageId,
        externalReference
      }
    };

    await enrollmentRef.set(enrollmentData);

    // Enviar correo de felicitación por Trigger Email y actualizar regalías
    try {
      let productTitle = 'tu curso';
      let productPrice = 0;

      if (productType === 'followup') {
        const followupSnap = await db.collection('followups').doc(productId).get();
        if (followupSnap.exists) {
          productTitle = followupSnap.data()?.title || 'tu mentoría';
          productPrice = followupSnap.data()?.price || 0;
        }
      } else {
        const courseSnap = await db.collection('courses').doc(productId).get();
        if (courseSnap.exists) {
          productTitle = courseSnap.data()?.title || 'tu curso';
          productPrice = courseSnap.data()?.price || 0;
        }
      }
      
      let mentorName = undefined;
      let mentorEmail = undefined;
      if (mentorId) {
        const mentorSnap = await db.collection('users').doc(mentorId).get();
        if (mentorSnap.exists) {
          mentorName = mentorSnap.data()?.displayName;
          mentorEmail = mentorSnap.data()?.email;
        }
        
        // Sumar la venta al acumulador del tutor si tiene precio > 0
        if (productPrice > 0) {
          await db.collection('users').doc(mentorId).update({
            'billingCycle.monthlySalesAmount': FieldValue.increment(productPrice)
          });
          console.log(`[Enrollment] Sumados $${productPrice} a las ventas del tutor ${mentorId}`);
        }
      }

      await sendWelcomeEmailServer({
        studentEmail: normalizedEmail,
        studentName,
        courseTitle: productTitle,
        mentorName,
        mentorEmail
      });
    } catch (emailErr) {
      console.error('[Enrollment] Error en post-enrollment (correo o regalías):', emailErr);
    }

    // 4. Actualizar estadísticas de la página de forma atómica
    await db.collection('salesPages').doc(pageId).update({
      'stats.conversions': FieldValue.increment(1),
      'stats.lastSaleAt': FieldValue.serverTimestamp()
    });

    // 5. Convertir el Lead asociado (si existe) → 'converted'
    //    Buscamos por email + productId para encontrar el lead original.
    try {
      const leadsQuery = await db.collection('leads')
        .where('studentEmail', '==', normalizedEmail)
        .where('courseId', '==', productId) // Mantenemos courseId en el WHERE por compatibilidad si el lead se guardó así
        .limit(1)
        .get();

      if (!leadsQuery.empty) {
        const leadDoc = leadsQuery.docs[0];
        await leadDoc.ref.update({
          status: 'converted',
          paymentId: paymentId,
          updatedAt: FieldValue.serverTimestamp()
        });
        const leadReferidoId = leadDoc.data().referidoId || referidoId || null;
        console.log(`[Leads] Lead ${leadDoc.id} convertido exitosamente. Referido: ${leadReferidoId}`);
      } else {
        console.log(`[Leads] No se encontró lead previo para ${normalizedEmail} / Producto: ${productId}. Venta directa sin lead.`);
      }
    } catch (leadError: any) {
      // No propagamos el error — la inscripción ya fue exitosa.
      // El lead puede corregirse manualmente si es necesario.
      console.error(`[Leads] Error al convertir lead (no crítico):`, leadError.message);
    }

    console.log(`[Enrollment] ÉXITO: Alumno ${normalizedEmail} inscrito en producto ${productId}`);
    return { success: true, enrollmentId };

  } catch (error: any) {
    console.error('[Enrollment Error]', error);
    throw error;
  }
}
