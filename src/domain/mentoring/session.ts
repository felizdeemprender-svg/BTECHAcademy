/**
 * Mentoría — Sesión (subcolección `followups/{id}/sessions`).
 * `status` se deriva: completed si finalizada, scheduled si tiene
 * fecha, pending en otro caso (regla de handleSaveSession).
 */
import { z } from 'zod';

export const SessionStatusSchema = z.enum(['pending', 'scheduled', 'completed']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionFileSchema = z.object({
  name: z.string().min(1, 'nombre vacío'),
  url: z.string().min(1, 'url vacía'),
});
export type SessionFile = z.infer<typeof SessionFileSchema>;

export const MentoringSessionSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  followUpId: z.string().min(1, 'followUpId vacío'),
  orderIndex: z.number().int().min(0).default(0),
  isAdditional: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  status: SessionStatusSchema.default('pending'),
  /** Fecha 'yyyy-mm-dd' y hora 'HH:MM' (formato del formulario). */
  date: z.string().default(''),
  time: z.string().default(''),
  duration: z.number().int().min(0).default(60),
  topics: z.array(z.string()).default([]),
  minutes: z.string().default(''),
  calendarEventId: z.string().optional(),
  calendarEventLink: z.string().optional(),
  files: z.array(SessionFileSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type MentoringSession = z.infer<typeof MentoringSessionSchema>;

export function parseMentoringSession(data: unknown): MentoringSession {
  return MentoringSessionSchema.parse(data);
}

/** Completa si está marcada o su estado es completed (igual que useFollowUps). */
export function isSessionCompleted(
  session: Pick<MentoringSession, 'isCompleted' | 'status'>,
): boolean {
  return session.isCompleted || session.status === 'completed';
}

export function deriveSessionStatus(isCompleted: boolean, date: string): SessionStatus {
  if (isCompleted) return 'completed';
  if (date.trim() !== '') return 'scheduled';
  return 'pending';
}

function sessionTimestamp(session: Pick<MentoringSession, 'date' | 'time'>): number | null {
  if (!session.date) return null;
  const ms = new Date(`${session.date}T${session.time || '00:00'}`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Orden de sesiones: por fecha/hora, luego por orderIndex
 * (regla extraída de seguimientos/[id]/page.tsx).
 */
export function compareSessions(
  a: Pick<MentoringSession, 'date' | 'time' | 'orderIndex'>,
  b: Pick<MentoringSession, 'date' | 'time' | 'orderIndex'>,
): number {
  const timeA = sessionTimestamp(a);
  const timeB = sessionTimestamp(b);
  if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
  if (timeA !== null && timeB === null) return -1;
  if (timeA === null && timeB !== null) return 1;
  return a.orderIndex - b.orderIndex;
}
