import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { handleGeneratePlan } from '@/lib/api/sales-page-handlers';
import { GenkitCoordinationPlanner } from '@/data/ai/coordination-planner';

/**
 * POST /api/campaigns/plan body { campaignTitle, strategyType, durationDays, targetAudience? }.
 * Genera el cronograma con IA (requiere autenticación, sin datos de mentor).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const body: unknown = await request.json().catch(() => null);
    return await handleGeneratePlan(new GenkitCoordinationPlanner(), caller, body);
  } catch (error) {
    console.error('[API campaigns/plan]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
