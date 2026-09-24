import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import {
  handleDeleteTask,
  handleSubmitTask,
  handleTaskProgress,
} from '@/lib/api/program-detail-handlers';

/**
 * PATCH /api/mentoring/programs/[id]/tasks/[taskId]?action=submit|progress
 * submit: entrega con score/feedback (progress 100 + completed).
 * progress: { progress, status } (actualización manual del mentor).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id, taskId } = await params;
    const action = request.nextUrl.searchParams.get('action') ?? 'submit';
    const gateway = await resolveGateway();
    const body: unknown = await request.json().catch(() => null);
    if (action === 'progress') {
      return handleTaskProgress(gateway, caller, id, taskId, body);
    }
    return handleSubmitTask(gateway, caller, id, taskId, body);
  } catch (error) {
    console.error('[API mentoring task PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/mentoring/programs/[id]/tasks/[taskId]. Solo mentor/admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id, taskId } = await params;
    return await handleDeleteTask(await resolveGateway(), caller, id, taskId);
  } catch (error) {
    console.error('[API mentoring task DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
