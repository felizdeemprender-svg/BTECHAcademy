/**
 * API — Handlers testeables de programas de mentoría.
 * Reciben gateway y llamante inyectados (los route.ts solo cablean).
 * Authz: operar programas de un mentor si es él mismo o admin.
 */
import { NextResponse } from 'next/server';

import {
  getMentorPrograms,
  listAllPrograms,
} from '@/domain/mentoring/use-cases/get-mentor-programs';
import {
  createMentoringProgram,
  removeMentoringProgram,
  setProgramStatus,
  updateMentoringProgram,
} from '@/domain/mentoring/use-cases/manage-program';
import { FirestoreMentoringProgramRepository } from '@/data/firestore/program-repo';
import { FirestoreSessionRepository } from '@/data/firestore/session-repo';
import { FirestoreTaskRepository } from '@/data/firestore/task-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';

import { canAccessMentorData, type Caller } from './mentor-auth';
import { forbidden, toApiResponse, unauthorized } from './results';

export async function handleListPrograms(
  gateway: FirestoreGateway,
  caller: Caller | null,
  mentorId: string,
  all = false,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const repo = new FirestoreMentoringProgramRepository(gateway);
  if (all) {
    if (!caller.isAdmin) return forbidden();
    return toApiResponse(await listAllPrograms(repo));
  }
  if (!mentorId || !canAccessMentorData(caller, mentorId)) return forbidden();
  return toApiResponse(await getMentorPrograms(repo, { mentorId }));
}

/**
 * POST /api/mentoring/programs. Crea programa + sesiones iniciales.
 * Los archivos ya vienen subidos (planGuideUrl/masterFileUrl en el body).
 */
export async function handleCreateProgram(
  gateway: FirestoreGateway,
  caller: Caller | null,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const payload = (body ?? {}) as { mentorId?: string };
  if (!payload.mentorId || !canAccessMentorData(caller, payload.mentorId)) {
    return forbidden();
  }
  const programs = new FirestoreMentoringProgramRepository(gateway);
  const sessions = new FirestoreSessionRepository(gateway);
  return toApiResponse(await createMentoringProgram(programs, sessions, body));
}

/**
 * PATCH /api/mentoring/programs/[id]. Campos o { status }.
 */
export async function handlePatchProgram(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const programs = new FirestoreMentoringProgramRepository(gateway);
  const existing = await programs.findById(id);
  if (!existing) {
    return NextResponse.json({ error: `Mentoría ${id} no encontrada` }, { status: 404 });
  }
  if (!canAccessMentorData(caller, existing.mentorId)) return forbidden();

  const patch = (body ?? {}) as { status?: unknown };
  if (patch.status === 'active' || patch.status === 'suspended') {
    return toApiResponse(await setProgramStatus(programs, { id, status: patch.status }));
  }
  return toApiResponse(await updateMentoringProgram(programs, { ...(body as object), id }));
}

/**
 * DELETE /api/mentoring/programs/[id]. Bloqueado si hay tareas;
 * borra sesiones primero (igual que la página actual).
 */
export async function handleDeleteProgram(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const programs = new FirestoreMentoringProgramRepository(gateway);
  const existing = await programs.findById(id);
  if (!existing) {
    return NextResponse.json({ error: `Mentoría ${id} no encontrada` }, { status: 404 });
  }
  if (!canAccessMentorData(caller, existing.mentorId)) return forbidden();
  const sessions = new FirestoreSessionRepository(gateway);
  const tasks = new FirestoreTaskRepository(gateway);
  return toApiResponse(await removeMentoringProgram(programs, sessions, tasks, id));
}
