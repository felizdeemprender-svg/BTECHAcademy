/**
 * Mentoría — Contrato de lectura de programas.
 * Solo lectura en esta fase: buscar por ID y listar por mentor.
 * `null` = no existe. Datos corruptos = throw (el repo decide
 * si omitir en listas).
 */
import { z } from 'zod';

import { MentoringStatusSchema, type MentoringProgram } from './program';

export const MentoringProgramPatchSchema = z.object({
  title: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  planGuideUrl: z.string().nullable().optional(),
  masterFileUrl: z.string().nullable().optional(),
  status: MentoringStatusSchema.optional(),
});
export type MentoringProgramPatch = z.infer<typeof MentoringProgramPatchSchema>;

/** Programa nuevo: igual que MentoringProgram pero sin fechas (las pone el repo). */
export type NewMentoringProgram = Omit<MentoringProgram, 'createdAt' | 'updatedAt'>;

export interface MentoringProgramRepository {
  findById(id: string): Promise<MentoringProgram | null>;
  listByMentor(mentorId: string, limit?: number): Promise<MentoringProgram[]>;
  /** Todos los programas (solo admin). */
  listAll(limit?: number): Promise<MentoringProgram[]>;
  /** Crea con `createdAt`/`updatedAt` serverTimestamp (igual que la página actual). */
  create(program: NewMentoringProgram): Promise<void>;
  update(id: string, patch: MentoringProgramPatch): Promise<void>;
  remove(id: string): Promise<void>;
}
