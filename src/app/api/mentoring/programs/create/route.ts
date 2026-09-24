import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleCreateProgram } from '@/lib/api/program-handlers';

/**
 * POST /api/mentoring/programs. Crea programa + sesiones iniciales.
 * Mismo documento que la página actual (archivos ya subidos a Storage).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const body: unknown = await request.json().catch(() => null);
    return await handleCreateProgram(await resolveGateway(), caller, body);
  } catch (error) {
    console.error('[API mentoring/programs/create]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
