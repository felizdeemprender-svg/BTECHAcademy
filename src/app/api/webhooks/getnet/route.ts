import { NextRequest, NextResponse } from 'next/server';
import { verifyGetnetSignature, getWebhookSecret } from '@/lib/webhooks/verify-signature';
import { resolveGateway } from '@/lib/api/gateway';
import { processGetnetWebhook } from '@/domain/commerce/use-cases/getnet-webhook-use-case';

export async function POST(req: NextRequest) {
  try {
    const verification = await verifyGetnetSignature(req, getWebhookSecret('getnet'));

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const payload = verification.event!;
    console.log('[Getnet Webhook] Payload verificado:', payload);

    const gateway = await resolveGateway();
    return processGetnetWebhook(gateway, {
      status: payload.status,
      orderId: payload.order_id,
      paymentId: payload.payment_id || payload.id,
      payload,
    });
  } catch (error: any) {
    console.error('[Getnet Webhook Error]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
