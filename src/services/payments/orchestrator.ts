import { createMercadoPagoSession } from './mercadopago';
import { createGetnetSession } from './getnet';

export interface PaymentSessionParams {
  pageId: string;
  title: string;
  price: number;
  studentEmail: string;
  studentName: string;
  mentorId: string;
  baseUrl: string;
  referidoId?: string;
}

export async function processPaymentSession(gateway: string, paymentConfig: any, params: PaymentSessionParams) {
  if (gateway === 'mercadopago') {
    return await createMercadoPagoSession({
      ...params,
      mpAccessToken: paymentConfig.accessToken,
    });
  } else if (gateway === 'getnet') {
    return await createGetnetSession({
      ...params,
      clientId: paymentConfig.clientId,
      clientSecret: paymentConfig.clientSecret,
      sellerId: paymentConfig.sellerId,
    });
  } else {
    throw new Error(`Pasarela de pago no soportada: ${gateway}`);
  }
}
