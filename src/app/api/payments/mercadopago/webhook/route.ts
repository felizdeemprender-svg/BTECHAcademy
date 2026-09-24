import { NextRequest, NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleMpRedirect, handleMpWebhook } from '@/lib/api/payment-handlers';

/** WEBHOOK + REDIRECT públicos (los llama Mercado Pago / el browser). */
export async function POST(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    return handleMpWebhook(gateway, null, body);
  } catch (error: unknown) {
    console.error('[Webhook MP Error]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** REDIRECT (success URL): procesamiento sincrónico (fallback). */
export async function GET(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const { searchParams, origin } = new URL(req.url);
    return handleMpRedirect(
      gateway,
      null,
      {
        paymentId: searchParams.get('payment_id') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        externalReference: searchParams.get('external_reference') ?? undefined,
      },
      origin,
    );
  } catch (error: unknown) {
    console.error('[Redirect MP Error]', error);
    return NextResponse.redirect(`${new URL(req.url).origin}/dashboard/my-courses?error=system_error`);
  }
}
