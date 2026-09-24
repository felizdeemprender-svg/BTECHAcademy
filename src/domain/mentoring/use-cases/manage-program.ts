/**
 * Mentoría — Casos de uso de escritura de programas.
 * Replican las escrituras de seguimientos/page.tsx (mismos campos):
 * crear (+ sesiones iniciales), actualizar, cambiar estado y
 * borrar (bloqueado si hay tareas; borra sesiones primero).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import { MentoringTypeSchema } from '../program';
import type {
  MentoringProgramPatch,
  MentoringProgramRepository,
} from '../program-repository';
import type { SessionRepository } from '../session-repository';
import type { TaskRepository } from '../task-repository';

export const CreateProgramInputSchema = z.object({
  mentorId: z.string().min(1, 'mentorId vacío'),
  type: MentoringTypeSchema.default('individual'),
  title: z.string().min(1, 'título vacío'),
  goal: z.string().default(''),
  studentId: z.string().default(''),
  studentName: z.string().default(''),
  studentEmail: z.string().default(''),
  totalSessions: z.number().int().min(0).default(4),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  planGuideUrl: z.string().nullable().default(null),
  masterFileUrl: z.string().nullable().default(null),
  /** Solo tests: id determinista. Por defecto, aleatorio como la página actual. */
  id: z.string().min(1).optional(),
});
export type CreateProgramInput = z.infer<typeof CreateProgramInputSchema>;

function randomProgramId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function toUnavailable(e: unknown, what: string): DomainError {
  const message = e instanceof Error ? e.message : String(e);
  return unavailable(`No se pudo ${what}: ${message}`);
}

export async function createMentoringProgram(
  programs: MentoringProgramRepository,
  sessions: SessionRepository,
  rawInput: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = CreateProgramInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de mentoría inválidos', parsed.error.flatten()));
  }
  const input = parsed.data;
  // Paridad con la página actual: individual con invitación manual
  // puede crearse con studentId vacío (solo email).
  try {
    const id = input.id ?? randomProgramId();
    const isGroup = input.type === 'group';
    await programs.create({
      id,
      type: input.type,
      title: input.title,
      goal: input.goal,
      mentorId: input.mentorId,
      studentId: isGroup ? '' : input.studentId,
      studentName: isGroup ? '' : input.studentName,
      studentEmail: isGroup ? '' : input.studentEmail,
      totalSessions: input.totalSessions,
      status: 'active',
      startDate: input.startDate,
      endDate: input.endDate,
      planGuideUrl: input.planGuideUrl ?? undefined,
      masterFileUrl: isGroup ? (input.masterFileUrl ?? undefined) : undefined,
    });
    await sessions.createMany(
      id,
      Array.from({ length: input.totalSessions }, (_, i) => ({
        id: `${id}_s${i + 1}`,
        followUpId: id,
        orderIndex: i + 1,
      })),
    );
    return ok({ id });
  } catch (e) {
    return err(toUnavailable(e, 'crear la mentoría'));
  }
}

export const UpdateProgramInputSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  title: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  planGuideUrl: z.string().nullable().optional(),
  masterFileUrl: z.string().nullable().optional(),
});
export type UpdateProgramInput = z.infer<typeof UpdateProgramInputSchema>;

export async function updateMentoringProgram(
  programs: MentoringProgramRepository,
  rawInput: unknown,
): Promise<Result<void, DomainError>> {
  const parsed = UpdateProgramInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos inválidos', parsed.error.flatten()));
  }
  try {
    const existing = await programs.findById(parsed.data.id);
    if (!existing) return err(notFound(`Mentoría ${parsed.data.id} no encontrada`));
    const { id, ...rest } = parsed.data;
    const patch: MentoringProgramPatch = { ...rest };
    if (existing.type !== 'group') delete patch.masterFileUrl;
    await programs.update(id, patch);
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'actualizar la mentoría'));
  }
}

export async function setProgramStatus(
  programs: MentoringProgramRepository,
  input: { id: string; status: 'active' | 'suspended' },
): Promise<Result<void, DomainError>> {
  if (input.id.trim() === '') return err(validationError('id vacío'));
  try {
    const existing = await programs.findById(input.id);
    if (!existing) return err(notFound(`Mentoría ${input.id} no encontrada`));
    await programs.update(input.id, { status: input.status });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'cambiar el estado'));
  }
}

export async function removeMentoringProgram(
  programs: MentoringProgramRepository,
  sessions: SessionRepository,
  tasks: TaskRepository,
  id: string,
): Promise<Result<{ sessionsRemoved: number }, DomainError>> {
  if (id.trim() === '') return err(validationError('id vacío'));
  try {
    const existing = await programs.findById(id);
    if (!existing) return err(notFound(`Mentoría ${id} no encontrada`));
    const taskCount = await tasks.countByProgram(id);
    if (taskCount > 0) {
      return err(validationError('Existen tareas registradas', { taskCount }));
    }
    const sessionsRemoved = await sessions.removeAllByProgram(id);
    await programs.remove(id);
    return ok({ sessionsRemoved });
  } catch (e) {
    return err(toUnavailable(e, 'eliminar la mentoría'));
  }
}
