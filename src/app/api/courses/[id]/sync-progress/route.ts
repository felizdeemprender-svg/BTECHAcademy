import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleSyncCourseProgress } from '@/lib/api/course-progress-sync';

/**
 * POST /api/courses/[id]/sync-progress
 * Sincroniza el progreso del curso completado con tareas de mentoría vinculadas
 * y el historial académico (`student_achievements`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    const gateway = await resolveGateway();
    const body: unknown = await request.json().catch(() => null);
    return await handleSyncCourseProgress(gateway, caller, id, body);
  } catch (error) {
    console.error('[API course sync-progress POST]', error);
    return NextResponse.json({ error: 'Error interno al sincronizar progreso' }, { status: 500 });
  }
}

