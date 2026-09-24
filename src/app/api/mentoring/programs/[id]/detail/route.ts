import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import {
  handleAddSession,
  handleAssignTask,
  handleGetProgram,
  handleListSessions,
  handleListTasks,
} from '@/lib/api/program-detail-handlers';

/**
 * GET /api/mentoring/programs/[id]/detail?action=program|sessions|tasks
 * Lecturas del detalle (programa, sesiones ordenadas, tareas).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    const action = request.nextUrl.searchParams.get('action') ?? 'program';
    const gateway = await resolveGateway();
    if (action === 'sessions') return handleListSessions(gateway, caller, id);
    if (action === 'tasks') return handleListTasks(gateway, caller, id);
    return handleGetProgram(gateway, caller, id);
  } catch (error) {
    console.error('[API mentoring detail]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/mentoring/programs/[id]/detail?action=add-session|assign-task
 * body assign-task: NewTask. Crea sesión extra o asigna tarea.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    const action = request.nextUrl.searchParams.get('action') ?? '';
    const gateway = await resolveGateway();
    if (action === 'add-session') return handleAddSession(gateway, caller, id);
    if (action === 'assign-task') {
      const body: unknown = await request.json().catch(() => null);
      return handleAssignTask(gateway, caller, id, body);
    }
    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (error) {
    console.error('[API mentoring detail POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
