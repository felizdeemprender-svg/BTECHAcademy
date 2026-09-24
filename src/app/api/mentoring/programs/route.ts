import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleListPrograms } from '@/lib/api/program-handlers';

/**
 * GET /api/mentoring/programs?mentorId=... | ?all=1 (solo admin).
 * Lista programas de mentoría (con marca de activo).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const mentorId = request.nextUrl.searchParams.get('mentorId') ?? '';
    const all = request.nextUrl.searchParams.get('all') === '1';
    return await handleListPrograms(await resolveGateway(), caller, mentorId, all);
  } catch (error) {
    console.error('[API mentoring/programs]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
