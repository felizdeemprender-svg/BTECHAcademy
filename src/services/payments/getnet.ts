import { getAdminFirestore } from '@/firebase/admin';

const GETNET_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.globalgetnet.com'
  : 'https://api-sandbox.globalgetnet.com';

interface GetnetSessionParams {
  pageId: string;
  title: string;
  price: number;
  studentEmail: string;
  studentName: string;
  mentorId: string;
  clientId: string;
  clientSecret: string;
  sellerId: string;
  baseUrl: string;
}

export async function createGetnetSession(params: GetnetSessionParams) {
  const { pageId, title, price, studentEmail, studentName, mentorId, clientId, clientSecret, sellerId, baseUrl } = params;
  const db = getAdminFirestore();

  // 1. Obtener Token de Autenticación de Getnet
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const authResponse = await fetch(`${GETNET_BASE_URL}/auth/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`
    },
    body: 'grant_type=client_credentials&scope=oob'
  });

  if (!authResponse.ok) {
    const err = await authResponse.text();
    console.error('[Getnet Auth Error]', err);
    throw new Error('Error autenticando con Getnet');
  }

  const authData = await authResponse.json();
  const accessToken = authData.access_token;

  // 2. Crear Orden en Base de Datos
  const orderId = `btech_order_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

  await db.collection('pending_orders').doc(orderId).set({
    orderId,
    gateway: 'getnet',
    courseId: pageId, // Asumimos pageId como course identifier
    courseTitle: title,
    tutorId: mentorId,
    buyerEmail: studentEmail,
    buyerName: studentName,
    landingId: pageId,
    amount: price,
    status: 'pending',
    createdAt: new Date()
  });

  // 3. Crear Web Checkout
  const checkoutPayload = {
    seller_id: sellerId,
    amount: price * 100, // En centavos
    currency: 'ARS',
    order: {
      order_id: orderId,
      sales_tax: 0,
      product_type: 'digital'
    },
    customer: {
      first_name: studentName?.split(' ')[0] || 'Alumno',
      last_name: studentName?.split(' ').slice(1).join(' ') || 'Fastoria',
      email: studentEmail,
      document_type: 'DNI',
      document_number: '11111111'
    },
    device: {
      ip_address: '127.0.0.1',
      device_id: 'btech-checkout'
    },
    shippings: [{
      first_name: studentName?.split(' ')[0] || 'Alumno',
      name: studentName || 'Alumno Fastoria',
      email: studentEmail,
      amount: 0,
      address: {
        street: 'Digital',
        number: '123',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
        postal_code: '1000'
      }
    }],
    success_url: `${baseUrl}/v/${pageId}?payment_status=success`,
    cancel_url: `${baseUrl}/v/${pageId}?payment_status=cancelled`
  };

  const checkoutResponse = await fetch(`${GETNET_BASE_URL}/v1/checkout/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(checkoutPayload)
  });

  if (!checkoutResponse.ok) {
    const err = await checkoutResponse.text();
    console.error('[Getnet Checkout Error]', err);
    throw new Error('Error generando checkout de Getnet');
  }

  const checkoutData = await checkoutResponse.json();
  
  return {
    success: true,
    redirectUrl: checkoutData.redirect_url || checkoutData.payment_url,
    orderId
  };
}
