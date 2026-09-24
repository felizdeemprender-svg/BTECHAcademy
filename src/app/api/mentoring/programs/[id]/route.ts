import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleDeleteProgram, handlePatchProgram } from '@/lib/api/program-handlers';

/**
 * PATCH /api/mentoring/programs/[id]. Campos o { status }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    return await handlePatchProgram(await resolveGateway(), caller, id, body);
  } catch (error) {
    console.error('[API mentoring/programs/:id PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/mentoring/programs/[id]. Bloqueado si hay tareas.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    const { id } = await params;
    return await handleDeleteProgram(await resolveGateway(), caller, id);
  } catch (error) {
    console.error('[API mentoring/programs/:id DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
