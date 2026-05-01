import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET() {
  try {
    const methodsSnap = await adminDb.collection('systemPaymentMethods')
      .where('isActive', '==', true)
      .get();

    const methods = methodsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type, // 'mercadopago', 'paypal', 'stripe', etc.
        description: data.description,
        icon: data.icon
      };
    });

    return NextResponse.json({ methods });
  } catch (error: any) {
    console.error('[API_PAYMENT_METHODS_ERROR]:', error);
    return NextResponse.json({ error: 'Error al cargar métodos de pago' }, { status: 500 });
  }
}
