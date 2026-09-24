import { NextResponse } from 'next/server';
import { FirestoreGateway } from '@/data/firestore/gateway';
import { MercadoPagoPaymentProvider } from '@/data/payments/mercadopago-gateway';
import { LegacyEnrollmentService } from '@/data/payments/legacy-payment-services';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';

export interface MpWebhookDeps {
  readonly provider?: any;
  readonly subscriptionActivation?: any;
  readonly enrollment?: any;
}

class LegacySubscriptionActivation {
  async activateSubscription(input: any): Promise<any> {
    // This should ideally import processSuccessfulSubscription from subscription.ts
    // For now, it's a mock placeholder showing the domain injection
    return { success: true };
  }
}

async function findActiveMpAccessToken(gateway: FirestoreGateway): Promise<string | null> {
  if (gateway.queryByTwoFields) {
    const snap = await gateway.queryByTwoFields(
      'systemPaymentMethods',
      'type',
      'mercadopago',
      'isActive',
      true,
      1,
    );
    const raw = snap.docs[0]?.data() ?? {};
    const token = (raw.config as Record<string, unknown> | undefined)?.accessToken;
    return typeof token === 'string' ? token : null;
  }
  const methods = await new FirestorePaymentMethodRepository(gateway).listActiveSystemMethods();
  const found = methods.find((m) => m.type === 'mercadopago');
  const token = (found?.config as Record<string, unknown> | undefined)?.accessToken;
  return typeof token === 'string' ? token : null;
}

export async function processMercadoPagoWebhook(
  gateway: FirestoreGateway,
  input: { type?: string; dataId?: string },
  deps?: MpWebhookDeps
): Promise<NextResponse> {
  try {
    const { type, dataId } = input;
    console.log(`[MP_WEBHOOK_DOMAIN] Notificación recibida: ${type} - ID: ${dataId}`);

    if (type === 'payment' && dataId) {
      const accessToken = await findActiveMpAccessToken(gateway);
      if (!accessToken) {
        throw new Error('No hay métodos de pago configurados para validar el webhook');
      }
      
      const provider = deps?.provider ?? new MercadoPagoPaymentProvider();
      const paymentData = await provider.getPayment(accessToken, dataId);
      const status = paymentData?.status;
      const externalReference = paymentData?.externalReference;
      const paymentId = paymentData?.id ?? dataId;

      if (!externalReference) {
        console.warn(`[MP_WEBHOOK_DOMAIN] Pago ${paymentId} no tiene external_reference. Ignorando.`);
        return NextResponse.json({ received: true });
      }

      const refData = JSON.parse(externalReference);
      const { userId, planId, leadData, isUpgrade } = refData;

      if (planId) {
        console.log(`[MP_WEBHOOK_DOMAIN] Suscripción de Tutor (Upgrade: ${!!isUpgrade})`);
        const activator = deps?.subscriptionActivation ?? new LegacySubscriptionActivation();
        await activator.activateSubscription({
          paymentId: String(paymentId),
          planId,
          status: status || 'unknown',
          userId,
          email: leadData?.email || paymentData?.payerEmail,
          displayName: leadData ? `${leadData.firstName} ${leadData.lastName}` : '',
          isUpgrade: !!isUpgrade,
        });
      } else if (refData.pageId) {
        console.log(`[MP_WEBHOOK_DOMAIN] Inscripción de Alumno para pago ${paymentId}`);
        const enrollment = deps?.enrollment ?? new LegacyEnrollmentService();
        await enrollment.completeEnrollment({
          paymentId: String(paymentId),
          externalReference,
          status: status || 'unknown',
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[MP_WEBHOOK_DOMAIN_ERROR]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ received: true, error: message });
  }
}
