import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleCreateCampaign } from '@/lib/api/sales-page-handlers';

/**
 * POST /api/campaigns body { mentorId, title, salesPageId, courseId?, strategy, startDate }.
 * Publica la campaña (mismo documento que handleFinalPublish).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const body: unknown = await request.json().catch(() => null);
    return await handleCreateCampaign(await resolveGateway(), caller, body);
  } catch (error) {
    console.error('[API campaigns/create]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
