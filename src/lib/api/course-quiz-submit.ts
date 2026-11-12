import { NextResponse } from 'next/server';
import { z } from 'genkit';

import { ai } from '@/ai/genkit';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import {
  computeObjectiveQuizScore,
  normalizeQuizQuestionForEval,
  type EvaluatableQuestion,
} from '@/lib/courses/quiz-evaluation';

import {
  findCallerCourseEnrollments,
  pickBestCourseEnrollment,
  resolveCallerEmail,
  syncCourseAchievementsAndTasks,
} from './course-progress-sync';
import type { Caller } from './mentor-auth';
import { forbidden, unauthorized } from './results';

export interface QuizEvalResult {
  score: number;
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
}

export type QuizEvaluator = (params: {
  questions: EvaluatableQuestion[];
  answers: Record<string, unknown>;
  tutorUid: string;
  studentName?: string;
  studentUid: string;
}) => Promise<QuizEvalResult>;

interface SubmitQuizBody {
  moduleId?: string;
  answers?: Record<string, unknown>;
  isSupport?: boolean;
}

const QuizOutputSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  strengths: z.array(z.string()),
  areasToImprove: z.array(z.string()),
});

export async function defaultQuizEvaluator(params: {
  questions: EvaluatableQuestion[];
  answers: Record<string, unknown>;
  tutorUid: string;
  studentName?: string;
  studentUid: string;
}): Promise<QuizEvalResult> {
  const evaluationData = params.questions.map((q, i) =>
    normalizeQuizQuestionForEval(q, params.answers[i.toString()], i)
  );
  const objectiveScore = computeObjectiveQuizScore(evaluationData);

  const promptText = `Actúa como un mentor experto y empático. Tu tarea es evaluar las respuestas de un alumno a un examen de un módulo.

Datos del examen:
Alumno: ${params.studentName || 'Estudiante'}

Preguntas y Respuestas del Alumno:
${evaluationData
  .map(
    (d) => `Pregunta ${d.index}: ${d.question}
Tipo de pregunta: ${d.type}${
      d.options.length > 0
        ? `\nOpciones disponibles: ${d.options
            .map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`)
            .join(' | ')}`
        : ''
    }
Respuesta Correcta Esperada: ${d.correctAnswer}
Respuesta que dio el Alumno: ${d.studentAnswer}
---`
  )
  .join('\n')}

Instrucciones para la evaluación:
1. Evalúa la precisión de cada respuesta comparándola con la esperada.
2. Para las respuestas de tipo "free_response" (libre), sé flexible pero busca que el alumno haya capturado los conceptos clave mencionados en la respuesta esperada.
3. Calcula un puntaje final de 0 a 100 basado en el acierto general.${
    objectiveScore !== null
      ? ` (Nota objetiva calculada: ${objectiveScore}/100; respeta este puntaje numérico exacto).`
      : ''
  }
4. Redacta un feedback motivador en segunda persona (ej: "Has demostrado un gran dominio...") que ayude al alumno a entender su progreso.
5. Identifica claramente las fortalezas demostradas y las áreas que requieren más estudio o repaso.`;

  const { output } = await ai.generate(
    {
      prompt: promptText,
      output: { schema: QuizOutputSchema },
      context: { uid: params.studentUid, role: 'alumno' },
    },
    'quiz_evaluation',
    params.tutorUid
  );

  if (!output) {
    throw new Error('No se pudo generar la evaluación del desempeño mediante la IA.');
  }

  return {
    score: objectiveScore ?? output.score,
    feedback: output.feedback,
    strengths: Array.isArray(output.strengths) ? output.strengths : [],
    areasToImprove: Array.isArray(output.areasToImprove) ? output.areasToImprove : [],
  };
}

function generateAttemptId(): string {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Evalúa y registra un intento de desafío de módulo en el servidor,
 * actualiza `enrollments`, guarda `student_achievements` si llega al 100%
 * y sincroniza tareas de mentoría vinculadas.
 */
export async function handleSubmitCourseQuiz(
  gateway: FirestoreGateway,
  caller: Caller | null,
  courseId: string,
  rawBody: unknown,
  evaluator: QuizEvaluator = defaultQuizEvaluator
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!courseId?.trim()) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as SubmitQuizBody;
  const moduleId = typeof body.moduleId === 'string' ? body.moduleId.trim() : '';
  const answers =
    body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
      ? body.answers
      : {};

  if (!moduleId) {
    return NextResponse.json({ error: 'moduleId requerido' }, { status: 400 });
  }

  const callerEmail = await resolveCallerEmail(gateway, caller);
  const userSnap = await gateway.getDoc('users', caller.uid);
  const studentName =
    (userSnap?.data()?.displayName as string | undefined) || callerEmail || 'Estudiante';

  const matchingEnrollments = await findCallerCourseEnrollments(
    gateway,
    caller.uid,
    callerEmail,
    courseId
  );
  if (matchingEnrollments.length === 0) {
    return forbidden();
  }

  const enrollment = pickBestCourseEnrollment(matchingEnrollments);
  const courseSnap = await gateway.getDoc('courses', courseId);
  if (!courseSnap?.exists) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }
  const courseData = courseSnap.data() || {};

  const modulesSnap = await gateway.listSubDocs('courses', courseId, 'modules');
  const modulesList = modulesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() || {}),
  })) as Array<Record<string, any> & { id: string }>;
  const activeModule = modulesList.find((m) => m.id === moduleId);
  if (!activeModule) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
  }

  const completedModules: string[] = Array.isArray(enrollment.progress?.completedModules)
    ? [...enrollment.progress.completedModules]
    : [];
  const rawEvaluations = enrollment.progress?.evaluations;
  const normalizedEvaluations: Record<string, any> =
    rawEvaluations && !Array.isArray(rawEvaluations) && typeof rawEvaluations === 'object'
      ? { ...rawEvaluations }
      : {};

  const prevEval = normalizedEvaluations[moduleId];
  const isCompletedModule = completedModules.includes(moduleId);
  const supportQuestions = Array.isArray(activeModule.supportQuestions)
    ? activeModule.supportQuestions
    : [];
  const mainQuestions = Array.isArray(activeModule.questions) ? activeModule.questions : [];
  const useSupport =
    !!body.isSupport ||
    (!!prevEval &&
      !isCompletedModule &&
      !!activeModule.enableSupportQuestions &&
      supportQuestions.length > 0 &&
      !prevEval.isSupport);

  const targetQuestions: EvaluatableQuestion[] = useSupport ? supportQuestions : mainQuestions;
  if (targetQuestions.length === 0) {
    return NextResponse.json(
      { error: 'Este módulo no tiene preguntas configuradas.' },
      { status: 400 }
    );
  }

  const allAnswered = targetQuestions.every((_, idx) => {
    const val = answers[idx.toString()];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });
  if (!allAnswered) {
    return NextResponse.json(
      { error: 'Debes responder todas las preguntas antes de finalizar.' },
      { status: 400 }
    );
  }

  const evalOutput = await evaluator({
    questions: targetQuestions,
    answers,
    tutorUid: (courseData.mentorId as string) || caller.uid,
    studentName,
    studentUid: caller.uid,
  });

  const nowIso = new Date().toISOString();
  const minPassing = typeof activeModule.minPassingScore === 'number' ? activeModule.minPassingScore : 70;
  const isPassing = evalOutput.score >= minPassing;

  const attemptId = generateAttemptId();
  const attemptData = {
    id: attemptId,
    courseEnrollmentId: enrollment.id,
    courseId,
    moduleId,
    studentId: caller.uid,
    score: evalOutput.score,
    feedback: evalOutput.feedback,
    answers,
    questions: targetQuestions,
    completedAt: nowIso,
  };
  await gateway.createDoc('quiz_attempts', attemptId, attemptData);

  const nextCompletedModules =
    isPassing && !completedModules.includes(moduleId)
      ? [...completedModules, moduleId]
      : completedModules;

  const updatedEvaluations = {
    ...normalizedEvaluations,
    [moduleId]: {
      score: evalOutput.score,
      feedback: evalOutput.feedback,
      strengths: evalOutput.strengths,
      areasToImprove: evalOutput.areasToImprove,
      submittedAt: nowIso,
      answers,
      questions: targetQuestions,
      isSupport: useSupport,
    },
  };

  let processedCount = 0;
  for (const mod of modulesList) {
    const isCompletedMod = nextCompletedModules.includes(mod.id);
    const modEval = updatedEvaluations[mod.id];
    const hasEval = !!modEval;
    const allowsRetries = mod.allowRetries !== false;

    if (isCompletedMod) {
      processedCount++;
    } else if (hasEval && !allowsRetries) {
      const needsSupport =
        !!mod.enableSupportQuestions &&
        Array.isArray(mod.supportQuestions) &&
        mod.supportQuestions.length > 0;
      if (!needsSupport || modEval?.isSupport) {
        processedCount++;
      }
    }
  }

  const newProgressPercent =
    modulesList.length > 0 ? Math.round((processedCount / modulesList.length) * 100) : 0;

  const currentProgress =
    enrollment.progress && typeof enrollment.progress === 'object' ? enrollment.progress : {};

  await gateway.updateDoc('enrollments', enrollment.id, {
    studentId: caller.uid,
    progress: {
      ...currentProgress,
      evaluations: updatedEvaluations,
      completedModules: nextCompletedModules,
    },
    progressPercent: newProgressPercent,
  });

  const moduleTitles = new Map<string, string>();
  for (const mod of modulesList) {
    if (typeof mod.title === 'string' && mod.title.trim()) {
      moduleTitles.set(mod.id, mod.title);
    }
  }

  const { syncedTasks, achievementSaved } = await syncCourseAchievementsAndTasks(gateway, {
    courseId,
    callerUid: caller.uid,
    callerEmail,
    completedModules: nextCompletedModules,
    evaluations: updatedEvaluations,
    progressPercent: newProgressPercent,
    moduleTitles,
    latestScore: evalOutput.score,
    latestFeedback: evalOutput.feedback,
  });

  return NextResponse.json({
    data: {
      evaluation: {
        score: evalOutput.score,
        feedback: evalOutput.feedback,
        strengths: evalOutput.strengths,
        areasToImprove: evalOutput.areasToImprove,
        submittedAt: nowIso,
        isSupport: useSupport,
        answers,
        questions: targetQuestions,
      },
      isPassing,
      minPassingScore: minPassing,
      progressPercent: newProgressPercent,
      completedModules: nextCompletedModules,
      syncedTasks,
      achievementSaved,
    },
  });
}

