/**
 * Mentoría — Casos de uso del detalle del programa.
 * Sesiones y tareas con las mismas escrituras que seguimientos/[id]:
 * estado derivado de sesión, guardado, adicional, asignación,
 * entrega (con score/feedback ya evaluados) y progreso.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import { compareSessions, deriveSessionStatus, type MentoringSession } from '../session';
import type { MentoringProgramRepository } from '../program-repository';
import type { SessionRepository } from '../session-repository';
import { TaskPatchSchema, type TaskRepository } from '../task-repository';
import { NewTaskSchema } from '../task-repository';

function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function toUnavailable(e: unknown, what: string): DomainError {
  const message = e instanceof Error ? e.message : String(e);
  return unavailable(`No se pudo ${what}: ${message}`);
}

async function requireProgram(
  programs: MentoringProgramRepository,
  id: string,
) {
  if (id.trim() === '') return err(validationError('id vacío'));
  const program = await programs.findById(id);
  if (!program) return err(notFound(`Mentoría ${id} no encontrada`));
  return ok(program);
}

export async function listProgramSessions(
  programs: MentoringProgramRepository,
  sessions: SessionRepository,
  programId: string,
): Promise<Result<MentoringSession[], DomainError>> {
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    const list = await sessions.listByProgram(programId);
    return ok([...list].sort(compareSessions));
  } catch (e) {
    return err(toUnavailable(e, 'listar sesiones'));
  }
}

export const SaveSessionInputSchema = z.object({
  programId: z.string().min(1),
  sessionId: z.string().min(1),
  date: z.string().default(''),
  time: z.string().default(''),
  duration: z.number().int().min(0).default(60),
  topics: z.array(z.string()).default([]),
  minutes: z.string().default(''),
  isCompleted: z.boolean().default(false),
  calendarEventId: z.string().optional(),
  calendarEventLink: z.string().optional(),
  files: z.array(z.object({ name: z.string(), url: z.string() })).default([]),
});

export async function saveSession(
  programs: MentoringProgramRepository,
  sessions: SessionRepository,
  rawInput: unknown,
): Promise<Result<void, DomainError>> {
  const parsed = SaveSessionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de sesión inválidos', parsed.error.flatten()));
  }
  try {
    const found = await requireProgram(programs, parsed.data.programId);
    if (!found.ok) return found;
    const { programId, sessionId, ...form } = parsed.data;
    await sessions.update(programId, sessionId, {
      ...form,
      status: deriveSessionStatus(form.isCompleted, form.date),
    });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'guardar la sesión'));
  }
}

export async function addAdditionalSession(
  programs: MentoringProgramRepository,
  sessions: SessionRepository,
  programId: string,
): Promise<Result<{ sessionId: string }, DomainError>> {
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    const existing = await sessions.listByProgram(programId);
    const maxIndex = existing.reduce((max, s) => Math.max(max, s.orderIndex || 0), 0);
    const sessionId = randomId();
    await sessions.createAdditional(programId, {
      id: sessionId,
      followUpId: programId,
      orderIndex: maxIndex + 1,
    });
    return ok({ sessionId });
  } catch (e) {
    return err(toUnavailable(e, 'añadir la sesión extra'));
  }
}

export async function assignTask(
  programs: MentoringProgramRepository,
  tasks: TaskRepository,
  programId: string,
  rawTask: unknown,
): Promise<Result<{ taskId: string }, DomainError>> {
  const parsed = NewTaskSchema.safeParse(rawTask);
  if (!parsed.success) {
    return err(validationError('Datos de tarea inválidos', parsed.error.flatten()));
  }
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    const taskId = parsed.data.id ?? randomId();
    const { id: _ignored, ...rest } = parsed.data;
    await tasks.create(programId, { ...rest, id: taskId });
    return ok({ taskId });
  } catch (e) {
    return err(toUnavailable(e, 'asignar la tarea'));
  }
}

export async function submitTask(
  programs: MentoringProgramRepository,
  tasks: TaskRepository,
  programId: string,
  taskId: string,
  rawPatch: unknown,
): Promise<Result<void, DomainError>> {
  const parsed = TaskPatchSchema.safeParse(rawPatch);
  if (!parsed.success) {
    return err(validationError('Entrega inválida', parsed.error.flatten()));
  }
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    await tasks.update(programId, taskId, {
      ...parsed.data,
      progress: 100,
      status: 'completed',
    });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'entregar la tarea'));
  }
}

export async function removeTask(
  programs: MentoringProgramRepository,
  tasks: TaskRepository,
  programId: string,
  taskId: string,
): Promise<Result<void, DomainError>> {
  if (programId.trim() === '' || taskId.trim() === '') {
    return err(validationError('ids vacíos'));
  }
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    await tasks.remove(programId, taskId);
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'eliminar la tarea'));
  }
}

export async function updateTaskProgress(
  programs: MentoringProgramRepository,
  tasks: TaskRepository,
  programId: string,
  taskId: string,
  progress: number,
  status: 'pending' | 'completed',
): Promise<Result<void, DomainError>> {
  if (programId.trim() === '' || taskId.trim() === '') {
    return err(validationError('ids vacíos'));
  }
  try {
    const found = await requireProgram(programs, programId);
    if (!found.ok) return found;
    await tasks.update(programId, taskId, { progress, status });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'actualizar la tarea'));
  }
}
