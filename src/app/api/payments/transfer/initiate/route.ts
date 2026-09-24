import { NextRequest, NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleInitiateTransfer } from '@/lib/api/transfer-handlers';

/** Pública por contrato legacy: crea la orden pendiente y notifica. */
export async function POST(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    return handleInitiateTransfer(gateway, null, body);
  } catch (error: unknown) {
    console.error('[TransferInitiate] Error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno del servidor', details }, { status: 500 });
  }
}
