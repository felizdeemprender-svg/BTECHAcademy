/**
 * Mentoría — Logro académico (colección implícita de achievements).
 * Registro permanente con ID `{studentId}_{courseId}`: sobrevive
 * al borrado del curso (snapshot de título y promedios).
 * Compatible con `StudentAchievement` de src/types/student.ts.
 */
import { z } from 'zod';

export const EvaluationDataSchema = z
  .object({
    score: z.number().min(0),
    feedback: z.string().default(''),
    submittedAt: z.string().min(1, 'submittedAt vacío'),
    isSupport: z.boolean().optional(),
    strengths: z.array(z.string()).optional(),
    areasToImprove: z.array(z.string()).optional(),
    answers: z.record(z.unknown()).optional(),
    questions: z.array(z.unknown()).optional(),
  })
  .catchall(z.unknown());
export type EvaluationData = z.infer<typeof EvaluationDataSchema>;

export const ModuleSummarySchema = z.object({
  moduleId: z.string().min(1, 'moduleId vacío'),
  moduleTitle: z.string().min(1, 'título vacío'),
  score: z.number().min(0),
  completedAt: z.string().min(1, 'completedAt vacío'),
});
export type ModuleSummary = z.infer<typeof ModuleSummarySchema>;

export const StudentAchievementSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  studentId: z.string().min(1, 'studentId vacío'),
  studentEmail: z.string().min(1, 'email vacío'),
  courseId: z.string().min(1, 'courseId vacío'),
  courseTitle: z.string().min(1, 'título vacío'),
  mentorId: z.string().min(1, 'mentorId vacío'),
  completedAt: z.string().min(1, 'completedAt vacío'),
  finalScore: z.number().min(0),
  moduleSummary: z.array(ModuleSummarySchema).default([]),
});
export type StudentAchievement = z.infer<typeof StudentAchievementSchema>;

/** ID determinista del logro: `{studentId}_{courseId}`. */
export function buildAchievementId(studentId: string, courseId: string): string {
  return `${studentId}_${courseId}`;
}

/** Promedio simple de los módulos (media aritmética). */
export function averageModuleScore(summaries: readonly Pick<ModuleSummary, 'score'>[]): number {
  if (summaries.length === 0) return 0;
  const total = summaries.reduce((acc, s) => acc + s.score, 0);
  return total / summaries.length;
}
