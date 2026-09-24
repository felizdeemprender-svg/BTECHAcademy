import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleExecuteCampaign } from '@/lib/api/campaign-handlers';

/**
 * POST /api/campaigns/[id]/execute
 * Disparo manual de las acciones del día actual (un log por canal;
 * Social expande a las 5 plataformas). Solo lectura de credenciales
 * del propio llamante; no recibe ni devuelve secrets.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    return await handleExecuteCampaign(await resolveGateway(), caller, id);
  } catch (error) {
    console.error('[API campaigns/:id/execute]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
