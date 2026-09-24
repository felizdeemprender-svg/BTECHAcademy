import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleSaveSession } from '@/lib/api/program-detail-handlers';

/**
 * PATCH /api/mentoring/programs/[id]/sessions/[sessionId]
 * Guarda la sesión (estado derivado en servidor).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id, sessionId } = await params;
    const body: unknown = await request.json().catch(() => null);
    return await handleSaveSession(await resolveGateway(), caller, id, {
      ...(body as object),
      sessionId,
    });
  } catch (error) {
    console.error('[API mentoring session PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
