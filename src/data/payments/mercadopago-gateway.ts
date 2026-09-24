/**
 * Capa de datos — Pasarela Mercado Pago (F0.2).
 * Único lugar con el SDK `mercadopago`: ningún route ni handler
 * lo importa. El `accessToken` llega por parámetro desde el
 * use-case (misma fuente que hoy: `systemPaymentMethods.config`
 * o perfil del mentor). Sin cambios de keys ni de env.
 */
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

import type {
  PaymentDetails,
  PaymentProvider,
  SubscriptionPreferenceRequest,
  SubscriptionPreferenceResult,
} from '@/domain/commerce/payment-provider';

export class MercadoPagoPaymentProvider implements PaymentProvider {
  async createSubscriptionPreference(
    accessToken: string,
    req: SubscriptionPreferenceRequest,
  ): Promise<SubscriptionPreferenceResult> {
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            id: req.planId,
            title: req.title,
            quantity: 1,
            unit_price: req.unitPrice,
            currency_id: 'ARS',
          },
        ],
        payer: { email: req.payer.email, name: req.payer.name, surname: req.payer.surname },
        external_reference: req.externalReference,
        back_urls: {
          success: req.successUrl,
          failure: req.failureUrl,
          pending: req.pendingUrl,
        },
        auto_return: 'approved',
        notification_url: req.notificationUrl,
      },
    });

    return {
      id: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    };
  }

  async getPayment(accessToken: string, paymentId: string): Promise<PaymentDetails | null> {
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });
    if (!paymentData) return null;
    return {
      id: String(paymentId),
      externalReference: paymentData.external_reference,
      status: paymentData.status,
      payerEmail: (paymentData.payer as { email?: unknown } | undefined)?.email as string | undefined,
    };
  }
}
