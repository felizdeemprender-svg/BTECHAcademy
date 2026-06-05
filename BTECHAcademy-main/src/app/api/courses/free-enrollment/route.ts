import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';

export async function POST(req: NextRequest) {
  try {
    const db = getAdminFirestore();
    const { pageId, studentEmail, studentName } = await req.json();

    if (!pageId || !studentEmail) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const pageSnap = await db.collection('salesPages').doc(pageId).get();
    if (!pageSnap.exists) {
      return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
    }

    const pageData = pageSnap.data() || {};
    
    // Validar que el precio realmente sea 0
    if (pageData.price !== 0) {
      return NextResponse.json({ error: 'Este curso no es gratuito' }, { status: 403 });
    }

    const externalReference = JSON.stringify({
      pageId,
      studentEmail,
      mentorId: pageData.mentorId
    });

    const result = await processSuccessfulEnrollment({
      paymentId: `free_${Date.now()}`,
      externalReference,
      status: 'approved' // Simulamos que fue "aprobado" instantáneamente
    });

    if (result.success) {
      return NextResponse.json({ success: true, redirectUrl: `/my-courses` });
    } else {
      throw new Error('No se pudo procesar la inscripción gratuita');
    }

  } catch (error: any) {
    console.error('Error en Free Enrollment:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
