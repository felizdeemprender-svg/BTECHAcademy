/**
 * Mentoría — Contrato del repositorio de tareas
 * (subcolección `followups/{id}/tasks`).
 */
import { z } from 'zod';

import { MentoringTaskStatusSchema, MentoringTaskTypeSchema } from './task';
import type { MentoringTask } from './task';

export const TaskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: MentoringTaskStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  answer: z.string().optional(),
  fileUrl: z.string().nullable().optional(),
  aiFeedback: z.string().optional(),
  score: z.number().min(0).optional(),
  completedAt: z.string().optional(),
});
export type TaskPatch = z.infer<typeof TaskPatchSchema>;

export const NewTaskSchema = z.object({
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
  deadline: z.string().optional(),
  /** Solo tests: id determinista. Por defecto, aleatorio como la página actual. */
  id: z.string().min(1).optional(),
});
export type NewTask = z.infer<typeof NewTaskSchema>;

export interface TaskRepository {
  listByProgram(programId: string): Promise<MentoringTask[]>;
  countByProgram(programId: string): Promise<number>;
  remove(programId: string, taskId: string): Promise<void>;
  /** Crea pendiente con progreso 0 (igual que la página actual). */
  create(programId: string, task: NewTask & { id: string }): Promise<void>;
  update(programId: string, taskId: string, patch: TaskPatch): Promise<void>;
}
