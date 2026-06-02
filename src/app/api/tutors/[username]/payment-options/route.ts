import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * GET /api/tutors/[username]/payment-options
 * Devuelve los métodos de pago activos de un mentor, con datos sanitizados
 * (sin credenciales secretas como accessToken). Usado por la landing pública.
 * El parámetro `username` en la URL es en realidad el mentorId (UID de Firebase).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: mentorId } = await params;

    if (!mentorId) {
      return NextResponse.json({ error: 'mentorId requerido' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const methodsSnap = await db
      .collection('users')
      .doc(mentorId)
      .collection('paymentMethods')
      .where('isActive', '==', true)
      .get();

    const methods = methodsSnap.docs.map((doc) => {
      const data = doc.data();
      // Sanitizar: nunca exponer accessToken de MercadoPago
      const sanitizedConfig: Record<string, string> = {};
      if (data.type === 'mercadopago') {
        sanitizedConfig.publicKey = data.config?.publicKey || '';
      } else if (data.type === 'transfer') {
        sanitizedConfig.alias = data.config?.alias || '';
        sanitizedConfig.cbu = data.config?.cbu || '';
        sanitizedConfig.bankName = data.config?.bankName || '';
        sanitizedConfig.titularName = data.config?.titularName || '';
      }

      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        config: sanitizedConfig,
      };
    });

    return NextResponse.json({ methods });
  } catch (error: any) {
    console.error('[PaymentOptions] Error:', error);
    return NextResponse.json({ error: 'Error interno', methods: [] }, { status: 500 });
  }
}
