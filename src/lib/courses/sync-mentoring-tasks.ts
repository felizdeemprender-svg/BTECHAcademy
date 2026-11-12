export interface LinkedTaskRecord {
  id: string;
  type?: string;
  courseId?: string;
  moduleId?: string;
  status?: string;
  progress?: number;
  score?: number;
  aiFeedback?: string;
  completedAt?: unknown;
}

export interface CourseProgressSyncInput {
  courseId: string;
  completedModules: string[];
  progressPercent: number;
  score?: number;
  feedback?: string;
  nowIso: string;
}

export interface TaskSyncPatch {
  progress: number;
  status: 'pending' | 'completed';
  completedAt?: unknown;
  score?: number;
  aiFeedback?: string;
}

export interface EnrollmentProgressSnapshot {
  courseId?: string;
  progressPercent?: number;
  progress?: {
    completedModules?: string[];
    evaluations?: Record<
      string,
      {
        score?: number;
        feedback?: string;
        submittedAt?: string;
      }
    >;
  };
}

/**
 * Calcula el patch de sincronización para una tarea de mentoría vinculada a un curso o módulo.
 * Devuelve null si la tarea no aplica o no requiere actualización.
 */
export function computeTaskSyncPatch(
  task: LinkedTaskRecord,
  input: CourseProgressSyncInput
): TaskSyncPatch | null {
  if (!task.courseId || task.courseId !== input.courseId) return null;

  if (task.type === 'module') {
    if (!task.moduleId) return null;
    const moduleCompleted = input.completedModules.includes(task.moduleId);
    if (!moduleCompleted) return null;
    if (task.status === 'completed' && (task.progress ?? 0) >= 100) return null;

    return {
      progress: 100,
      status: 'completed',
      completedAt: task.completedAt || input.nowIso,
      ...(typeof input.score === 'number' ? { score: input.score } : {}),
      ...(input.feedback ? { aiFeedback: input.feedback } : {}),
    };
  }

  if (task.type === 'course') {
    const normalizedProgress = Math.max(0, Math.min(100, Math.round(input.progressPercent)));
    const nextStatus: 'pending' | 'completed' =
      normalizedProgress >= 100 ? 'completed' : 'pending';

    if ((task.progress ?? 0) === normalizedProgress && task.status === nextStatus) {
      return null;
    }

    return {
      progress: normalizedProgress,
      status: nextStatus,
      ...(nextStatus === 'completed'
        ? {
            completedAt: task.completedAt || input.nowIso,
            ...(typeof input.score === 'number' ? { score: input.score } : {}),
            ...(input.feedback ? { aiFeedback: input.feedback } : {}),
          }
        : {}),
    };
  }

  return null;
}

function pickBestEnrollment(
  enrollments: EnrollmentProgressSnapshot[],
  courseId: string
): EnrollmentProgressSnapshot | null {
  const matching = enrollments.filter((e) => e.courseId === courseId);
  if (matching.length === 0) return null;
  return matching.reduce((best, current) => {
    const bestScore =
      (best.progressPercent ?? 0) * 100 + (best.progress?.completedModules?.length ?? 0);
    const curScore =
      (current.progressPercent ?? 0) * 100 + (current.progress?.completedModules?.length ?? 0);
    return curScore > bestScore ? current : best;
  });
}

function getLatestEvaluationMeta(
  enrollment: EnrollmentProgressSnapshot,
  moduleId?: string
): { score?: number; feedback?: string; submittedAt?: string } | null {
  const evals = enrollment.progress?.evaluations;
  if (!evals || Array.isArray(evals)) return null;
  if (moduleId && evals[moduleId]) return evals[moduleId];

  const entries = Object.values(evals).filter(Boolean);
  if (entries.length === 0) return null;
  const scores = entries.map((e) => e.score).filter((s): s is number => typeof s === 'number');
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
  const sortedByDate = [...entries].sort((a, b) =>
    String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))
  );
  return {
    score: avgScore,
    feedback: sortedByDate[0]?.feedback,
    submittedAt: sortedByDate[0]?.submittedAt,
  };
}

/**
 * Enriquece tareas vinculadas a cursos/módulos con el estado real del enrollment del alumno.
 * Garantiza que incluso tareas de mentorías grupales compartidas reflejen el progreso individual.
 */
export function enrichLinkedTasksWithEnrollments<T extends LinkedTaskRecord>(
  tasks: T[],
  enrollments: EnrollmentProgressSnapshot[]
): T[] {
  if (tasks.length === 0 || enrollments.length === 0) return tasks;

  return tasks.map((task) => {
    if ((task.type !== 'course' && task.type !== 'module') || !task.courseId) {
      return task;
    }

    const enrollment = pickBestEnrollment(enrollments, task.courseId);
    if (!enrollment) return task;

    const completedModules = enrollment.progress?.completedModules || [];
    const evalMeta = getLatestEvaluationMeta(
      enrollment,
      task.type === 'module' ? task.moduleId : undefined
    );

    const patch = computeTaskSyncPatch(task, {
      courseId: task.courseId,
      completedModules,
      progressPercent: enrollment.progressPercent ?? 0,
      score: evalMeta?.score,
      feedback: evalMeta?.feedback,
      nowIso: evalMeta?.submittedAt || new Date().toISOString(),
    });

    if (!patch) return task;

    return {
      ...task,
      ...patch,
      score: task.score ?? patch.score,
      aiFeedback: task.aiFeedback ?? patch.aiFeedback,
      completedAt: task.completedAt || patch.completedAt,
    };
  });
}

