/**
 * API — Handlers testeables del detalle del programa (sesiones/tareas).
 * Authz: el programa debe pertenecer al llamante o ser admin.
 */
import { NextResponse } from 'next/server';

import {
  addAdditionalSession,
  assignTask,
  listProgramSessions,
  removeTask,
  saveSession,
  submitTask,
  updateTaskProgress,
} from '@/domain/mentoring/use-cases/program-detail';
import { FirestoreMentoringProgramRepository } from '@/data/firestore/program-repo';
import { FirestoreSessionRepository } from '@/data/firestore/session-repo';
import { FirestoreTaskRepository } from '@/data/firestore/task-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';

import { canAccessMentorData, type Caller } from './mentor-auth';
import { forbidden, toApiResponse, unauthorized } from './results';

export type AccessLevel = 'manage' | 'submit';

function notFoundResponse(programId: string): NextResponse {
  return NextResponse.json({ error: `Mentoría ${programId} no encontrada` }, { status: 404 });
}

/**
 * Alumno inscripto (grupales): enrollment con courseId/productId == programa
 * y studentId o inviteEmail coincidentes.
 */
async function isEnrolledStudent(
  gateway: FirestoreGateway,
  callerUid: string,
  programId: string,
): Promise<boolean> {
  const userSnap = await gateway.getDoc('users', callerUid);
  const email = (userSnap?.data()?.email as string | undefined)?.toLowerCase().trim() ?? '';
  for (const field of ['courseId', 'productId']) {
    const snap = await gateway.queryByField('enrollments', field, programId);
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      if (raw.studentId === callerUid) return true;
      const invite = typeof raw.inviteEmail === 'string' ? raw.inviteEmail.toLowerCase().trim() : '';
      if (email && invite && invite === email) return true;
    }
  }
  return false;
}

async function requireProgramAccess(
  gateway: FirestoreGateway,
  caller: Caller,
  programId: string,
  level: AccessLevel,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const programs = new FirestoreMentoringProgramRepository(gateway);
  const existing = await programs.findById(programId);
  if (!existing) {
    return { ok: false, response: notFoundResponse(programId) };
  }
  if (caller.isAdmin || existing.mentorId === caller.uid) return { ok: true };
  if (level === 'manage') return { ok: false, response: forbidden() };
  if (existing.studentId && existing.studentId === caller.uid) return { ok: true };
  if (await isEnrolledStudent(gateway, caller.uid, programId)) return { ok: true };
  return { ok: false, response: forbidden() };
}

async function requireOwnership(
  gateway: FirestoreGateway,
  caller: Caller,
  programId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  return requireProgramAccess(gateway, caller, programId, 'manage');
}

async function requireReadOrSubmit(
  gateway: FirestoreGateway,
  caller: Caller,
  programId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  return requireProgramAccess(gateway, caller, programId, 'submit');
}

function repos(gateway: FirestoreGateway) {
  return {
    programs: new FirestoreMentoringProgramRepository(gateway),
    sessions: new FirestoreSessionRepository(gateway),
    tasks: new FirestoreTaskRepository(gateway),
  };
}

export async function handleGetProgram(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const access = await requireReadOrSubmit(gateway, caller, programId);
  if (!access.ok) return access.response;
  const { programs } = repos(gateway);
  return NextResponse.json({ data: await programs.findById(programId) });
}

export async function handleListSessions(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireReadOrSubmit(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, sessions } = repos(gateway);
  return toApiResponse(await listProgramSessions(programs, sessions, programId));
}

export async function handleSaveSession(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireOwnership(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, sessions } = repos(gateway);
  return toApiResponse(await saveSession(programs, sessions, { ...(body as object), programId }));
}

export async function handleAddSession(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireOwnership(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, sessions } = repos(gateway);
  return toApiResponse(await addAdditionalSession(programs, sessions, programId));
}

export async function handleListTasks(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireReadOrSubmit(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { tasks } = repos(gateway);
  return NextResponse.json({ data: await tasks.listByProgram(programId) });
}

export async function handleAssignTask(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireOwnership(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, tasks } = repos(gateway);
  return toApiResponse(await assignTask(programs, tasks, programId, body));
}

export async function handleSubmitTask(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
  taskId: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireReadOrSubmit(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, tasks } = repos(gateway);
  return toApiResponse(await submitTask(programs, tasks, programId, taskId, body));
}

export async function handleDeleteTask(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
  taskId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireOwnership(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const { programs, tasks } = repos(gateway);
  return toApiResponse(await removeTask(programs, tasks, programId, taskId));
}

export async function handleTaskProgress(
  gateway: FirestoreGateway,
  caller: Caller | null,
  programId: string,
  taskId: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const owned = await requireOwnership(gateway, caller, programId);
  if (!owned.ok) return owned.response;
  const patch = (body ?? {}) as { progress?: number; status?: 'pending' | 'completed' };
  const { programs, tasks } = repos(gateway);
  return toApiResponse(
    await updateTaskProgress(
      programs,
      tasks,
      programId,
      taskId,
      typeof patch.progress === 'number' ? patch.progress : 0,
      patch.status === 'completed' ? 'completed' : 'pending',
    ),
  );
}
