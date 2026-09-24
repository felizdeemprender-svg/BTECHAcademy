import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleListCampaigns } from '@/lib/api/campaign-handlers';

/**
 * GET /api/campaigns?mentorId=...
 * Lista campañas enriquecidas (día actual, progreso, ejecutable).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const mentorId = request.nextUrl.searchParams.get('mentorId') ?? '';
    return await handleListCampaigns(await resolveGateway(), caller, mentorId);
  } catch (error) {
    console.error('[API campaigns]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
