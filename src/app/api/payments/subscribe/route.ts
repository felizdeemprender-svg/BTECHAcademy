import { NextRequest, NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleSubscribe } from '@/lib/api/payment-handlers';

/** Pública por contrato legacy: crea trial/plan gratis o preferencia MP. */
export async function POST(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    return handleSubscribe(gateway, null, body);
  } catch (error: unknown) {
    console.error('[API_SUBSCRIBE_ERROR]:', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: message || 'Error interno del servidor' }, { status: 500 });
  }
}
