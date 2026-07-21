import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getAdminFirestore } from '@/firebase/admin';

interface MPSessionParams {
  pageId: string;
  title: string;
  price: number;
  studentEmail: string;
  studentName: string;
  mentorId: string;
  referidoId?: string;
  mpAccessToken: string;
  baseUrl: string;
}

export async function createMercadoPagoSession(params: MPSessionParams) {
  const { pageId, title, price, studentEmail, studentName, mentorId, referidoId, mpAccessToken, baseUrl } = params;
  const db = getAdminFirestore();

  // 1. Configurar MercadoPago
  const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
  const preference = new Preference(mpClient);

  // 2. Mapeo de Seguridad (Para el Webhook)
  try {
    const mpUserRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    });
    if (mpUserRes.ok) {
      const mpUser = await mpUserRes.json();
      const mpSellerId = String(mpUser.id);
      
      await db.collection('mp_seller_mappings').doc(mpSellerId).set({
        mentorId,
        lastActive: new Date().toISOString(),
        nickname: mpUser.nickname
      }, { merge: true });
    }
  } catch (e) {
    console.error('[MercadoPago] Error al mapear el Seller ID del mentor:', e);
  }

  // 3. Crear Preferencia
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  const externalReference = JSON.stringify({
    pageId,
    studentEmail: studentEmail || 'guest',
    studentName: studentName || '',
    mentorId,
    referidoId: referidoId || null
  });

  const body: any = {
    items: [
      {
        id: pageId,
        title: title,
        quantity: 1,
        unit_price: Number(price),
        currency_id: 'ARS'
      }
    ],
    payer: {
      email: studentEmail || undefined,
      name: studentName || undefined
    },
    back_urls: {
      success: `${baseUrl}/api/payments/mercadopago/webhook?status=approved`,
      failure: `${baseUrl}/v/${pageId}?payment_status=failure`,
      pending: `${baseUrl}/v/${pageId}?payment_status=pending`
    },
    external_reference: externalReference,
    statement_descriptor: 'Fastoria Academy',
    expires: false
  };

  if (!isLocal) {
    body.auto_return = 'approved';
    body.notification_url = `${baseUrl}/api/webhooks/mercadopago`;
  }

  const response = await preference.create({ body });

  return {
    success: true,
    redirectUrl: response.init_point,
    orderId: response.id // MP devuelve un preference ID
  };
}
