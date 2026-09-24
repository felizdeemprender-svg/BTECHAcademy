/**
 * Mentoría — Contrato del repositorio de sesiones
 * (subcolección `followups/{id}/sessions`).
 */
import { z } from 'zod';

import { SessionStatusSchema } from './session';
import type { MentoringSession } from './session';

export const SessionPatchSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  topics: z.array(z.string()).optional(),
  minutes: z.string().optional(),
  isCompleted: z.boolean().optional(),
  status: SessionStatusSchema.optional(),
  calendarEventId: z.string().optional(),
  calendarEventLink: z.string().optional(),
  files: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
});
export type SessionPatch = z.infer<typeof SessionPatchSchema>;

/** Sesión inicial: mismos campos que crea la página actual. */
export interface NewSession {
  readonly id: string;
  readonly followUpId: string;
  readonly orderIndex: number;
}

export interface SessionRepository {
  listByProgram(programId: string): Promise<MentoringSession[]>;
  /** Crea sesiones iniciales (pending, sin fecha) + `updatedAt`. */
  createMany(programId: string, sessions: NewSession[]): Promise<void>;
  /** Crea una sesión adicional (mismos campos que la página actual). */
  createAdditional(programId: string, session: NewSession): Promise<void>;
  update(programId: string, sessionId: string, patch: SessionPatch): Promise<void>;
  /** Borra todas las sesiones del programa. Devuelve cuántas borró. */
  removeAllByProgram(programId: string): Promise<number>;
}
