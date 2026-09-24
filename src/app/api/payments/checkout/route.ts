import { NextRequest, NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleCheckout } from '@/lib/api/payment-handlers';

export const dynamic = 'force-dynamic';

/** Pública por contrato legacy: deriva a la pasarela del tutor. */
export async function POST(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    const origin = req.nextUrl.origin;
    const baseUrl = req.headers.get('x-forwarded-proto')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
      : origin;
    return handleCheckout(gateway, null, { ...body, baseUrl });
  } catch (error: unknown) {
    console.error(`[Checkout Orchestrator] Error:`, error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno procesando el checkout', details }, { status: 500 });
  }
}
