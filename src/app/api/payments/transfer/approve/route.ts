import { NextRequest, NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleApproveTransfer } from '@/lib/api/transfer-handlers';

/** Pública por contrato legacy (ownership por mentorId del body). */
export async function POST(req: NextRequest) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    return handleApproveTransfer(gateway, null, body);
  } catch (error: unknown) {
    console.error('[TransferApprove] Error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno del servidor', details }, { status: 500 });
  }
}
