import { NextResponse } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleListSystemMethods } from '@/lib/api/payment-handlers';

/** Pública por contrato legacy: métodos del sistema activos. */
export async function GET() {
  try {
    const gateway = await resolveGateway();
    return handleListSystemMethods(gateway, null);
  } catch (error: unknown) {
    console.error('[API_PAYMENT_METHODS_ERROR]:', error);
    return NextResponse.json({ error: 'Error al cargar métodos de pago' }, { status: 500 });
  }
}
