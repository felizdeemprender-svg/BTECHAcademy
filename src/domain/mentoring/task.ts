/**
 * Mentoría — Tarea (subcolección `followups/{id}/tasks`).
 * Tipos: 'free' (desafío libre) | 'module' | 'course'.
 * Al entregar, el alumno pasa a progress 100 + status completed.
 */
import { z } from 'zod';

export const MentoringTaskTypeSchema = z.enum(['free', 'module', 'course']);
export type MentoringTaskType = z.infer<typeof MentoringTaskTypeSchema>;

export const MentoringTaskStatusSchema = z.enum(['pending', 'completed']);
export type MentoringTaskStatus = z.infer<typeof MentoringTaskStatusSchema>;

export const MentoringTaskSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  followUpId: z.string().min(1, 'followUpId vacío'),
  type: MentoringTaskTypeSchema.default('free'),
  title: z.string().min(1, 'título vacío'),
  description: z.string().default(''),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  moduleTitle: z.string().optional(),
  courseTitle: z.string().nullable().optional(),
  mentorId: z.string().optional(),
  mentorName: z.string().optional(),
  studentId: z.string().optional(),
  studentEmail: z.string().optional(),
  allowFileUpload: z.boolean().optional(),
  evaluationCriteria: z.string().optional(),
  status: MentoringTaskStatusSchema.default('pending'),
  progress: z.number().min(0).max(100).default(0),
  answer: z.string().optional(),
  fileUrl: z.string().nullable().optional(),
  aiFeedback: z.string().optional(),
  score: z.number().min(0).optional(),
  completedAt: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type MentoringTask = z.infer<typeof MentoringTaskSchema>;

export function parseMentoringTask(data: unknown): MentoringTask {
  return MentoringTaskSchema.parse(data);
}

export function isTaskCompleted(task: Pick<MentoringTask, 'status'>): boolean {
  return task.status === 'completed';
}

/**
 * Validez del formulario de asignación: libre requiere descripción;
 * módulo requiere curso + módulo; curso requiere curso.
 */
export function isTaskFormValid(form: {
  type: MentoringTaskType;
  description: string;
  courseId?: string;
  moduleId?: string;
}): boolean {
  if (form.type === 'free') return form.description.trim() !== '';
  if (form.type === 'module') {
    return !!form.courseId && !!form.moduleId;
  }
  return !!form.courseId;
}

/** Entrega del alumno: tarea nueva con progreso 100 y completada. */
export function submitTaskAnswer(
  task: MentoringTask,
  input: { answer: string; fileUrl?: string | null; aiFeedback?: string; score?: number; completedAt: string },
): MentoringTask {
  return {
    ...task,
    answer: input.answer,
    fileUrl: input.fileUrl ?? null,
    aiFeedback: input.aiFeedback,
    score: input.score,
    progress: 100,
    status: 'completed',
    completedAt: input.completedAt,
  };
}
