import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import {
  handleDeleteCampaign,
  handleGetCampaign,
  handlePatchCampaign,
} from '@/lib/api/campaign-handlers';

/**
 * GET /api/campaigns/[id]
 * Detalle de campaña enriquecido (día actual, acciones de hoy, progreso).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    return await handleGetCampaign(await resolveGateway(), caller, id);
  } catch (error) {
    console.error('[API campaigns/:id]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[id] body { strategy } | { autoPilot }.
 * Mismas escrituras que la página actual.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    return await handlePatchCampaign(await resolveGateway(), caller, id, body);
  } catch (error) {
    console.error('[API campaigns/:id PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id]. Solo documento
 * (Drive se limpia en la página, sin cambios).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    return await handleDeleteCampaign(await resolveGateway(), caller, id);
  } catch (error) {
    console.error('[API campaigns/:id DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
