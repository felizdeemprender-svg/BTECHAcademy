import { NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleSetupBilling } from '@/lib/api/payment-handlers';

export const dynamic = 'force-dynamic';

/** Pública por contrato legacy: setup Stripe del tutor. */
export async function POST(req: Request) {
  try {
    const gateway = await resolveGateway();
    const body = await req.json();
    return handleSetupBilling(gateway, null, body);
  } catch (error: unknown) {
    console.error('[SetupBilling] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
