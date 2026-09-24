import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyStripeSignature, verifyGetnetSignature, getWebhookSecret } from '@/lib/webhooks/verify-signature';
import { resolveGateway } from '@/lib/api/gateway';
import { handleSubscriptionsWebhookEvent } from '@/lib/api/webhook-handlers';

export async function POST(req: NextRequest) {
  try {
    const stripeSignature = req.headers.get('stripe-signature');
    const getnetSignature = req.headers.get('x-getnet-signature') || req.headers.get('getnet-signature');

    let provider: 'stripe' | 'getnet';
    let verification: { valid: boolean; event?: any; error?: string };

    if (stripeSignature) {
      provider = 'stripe';
      verification = await verifyStripeSignature(req, getWebhookSecret('stripe'));
    } else if (getnetSignature) {
      provider = 'getnet';
      verification = await verifyGetnetSignature(req, getWebhookSecret('getnet'));
    } else {
      return NextResponse.json({ error: 'Falta firma de webhook' }, { status: 400 });
    }

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const gateway = await resolveGateway();
    return handleSubscriptionsWebhookEvent(gateway, provider, verification.event);
  } catch (error: any) {
    console.error('[Webhooks] Error procesando evento:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
