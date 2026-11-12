import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleSubmitCourseQuiz } from '@/lib/api/course-quiz-submit';

/**
 * POST /api/courses/[id]/submit-quiz
 * Evalúa el desafío del módulo con IA, guarda el intento, actualiza la inscripción
 * y sincroniza logros y tareas de mentoría vinculadas.
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
    return await handleSubmitCourseQuiz(gateway, caller, id, body);
  } catch (error: any) {
    console.error('[API course submit-quiz POST]', error);
    const message =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'No se pudo completar la evaluación del desafío.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

