import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyStripeSignature, getWebhookSecret } from '@/lib/webhooks/verify-signature';
import { rateLimitConfigs } from '@/lib/rate-limit';
import { resolveGateway } from '@/lib/api/gateway';
import { processStripeWebhook } from '@/domain/commerce/use-cases/stripe-webhook-use-case';

export async function POST(req: NextRequest) {
  // Rate limiting para webhooks (primero, igual que hoy)
  const rateLimitResponse = await rateLimitConfigs.webhook(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const verification = await verifyStripeSignature(req as any, getWebhookSecret('stripe'));

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const gateway = await resolveGateway();
    return processStripeWebhook(gateway, verification.event);
  } catch (error: any) {
    console.error('[Stripe Webhook] Error crítico:', error);
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 });
  }
}
