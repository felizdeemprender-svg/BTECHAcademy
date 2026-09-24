/**
 * Mentoría — Programa (colección `followups`).
 * Modalidades: individual (1 a 1, requiere alumno) o grupal.
 * Compatible con `StudentFollowUp` de src/types/student.ts.
 */
import { z } from 'zod';

export const MentoringTypeSchema = z.enum(['individual', 'group']);
export type MentoringType = z.infer<typeof MentoringTypeSchema>;

export const MentoringStatusSchema = z.enum(['active', 'paused', 'suspended', 'finished']);
export type MentoringStatus = z.infer<typeof MentoringStatusSchema>;

export const MentoringProgramSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  type: MentoringTypeSchema.default('individual'),
  title: z.string().min(1, 'título vacío'),
  goal: z.string().default(''),
  mentorId: z.string().min(1, 'mentorId vacío'),
  /** Vacío en programas grupales (se gestionan sus alumnos aparte). */
  studentId: z.string().default(''),
  studentName: z.string().optional(),
  studentEmail: z.string().optional(),
  totalSessions: z.number().int().min(0).default(0),
  status: MentoringStatusSchema.default('active'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  planGuideUrl: z.string().nullish(),
  masterFileUrl: z.string().nullish(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type MentoringProgram = z.infer<typeof MentoringProgramSchema>;

export function parseMentoringProgram(data: unknown): MentoringProgram {
  return MentoringProgramSchema.parse(data);
}

export function isGroupProgram(program: Pick<MentoringProgram, 'type'>): boolean {
  return program.type === 'group';
}

/** Los programas 1 a 1 requieren alumno asignado; los grupales no. */
export function isProgramReadyToStart(
  program: Pick<MentoringProgram, 'type' | 'title' | 'studentId'>,
): boolean {
  if (program.title.trim() === '') return false;
  if (program.type !== 'group' && program.studentId.trim() === '') return false;
  return true;
}

export function isProgramActive(program: Pick<MentoringProgram, 'status'>): boolean {
  return program.status === 'active';
}

/** Etiqueta mostrada en la tabla de mentorías. */
export function programStatusLabel(status: MentoringStatus): string {
  switch (status) {
    case 'active':
      return 'En Curso';
    case 'paused':
      return 'Pausada';
    case 'suspended':
      return 'Suspendida';
    case 'finished':
      return 'Finalizada';
  }
}
