import { NextRequest, NextResponse } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { processMercadoPagoWebhook } from '@/domain/commerce/use-cases/mp-webhook-use-case';

// Mercado Pago NO verifica firma (hueco documentado, fix separado, no F1.1).
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const type = searchParams.get('type') || (body as { type?: string }).type;
    const dataId = searchParams.get('data.id') || (body as { data?: { id?: string } }).data?.id;

    const gateway = await resolveGateway();
    return processMercadoPagoWebhook(gateway, { type: type ?? undefined, dataId: dataId ?? undefined });
  } catch (error: any) {
    console.error('[MP_WEBHOOK_ERROR]:', error);
    return NextResponse.json({ received: true, error: error.message });
  }
}
