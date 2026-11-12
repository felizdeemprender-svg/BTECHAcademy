import { NextResponse } from 'next/server';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import {
  computeTaskSyncPatch,
  type LinkedTaskRecord,
} from '@/lib/courses/sync-mentoring-tasks';

import type { Caller } from './mentor-auth';
import { forbidden, unauthorized } from './results';

interface SyncBody {
  moduleId?: string;
  score?: number;
  feedback?: string;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

export async function resolveCallerEmail(
  gateway: FirestoreGateway,
  caller: Caller
): Promise<string> {
  const fromCaller = normalizeEmail(caller.email);
  if (fromCaller) return fromCaller;
  const userSnap = await gateway.getDoc('users', caller.uid);
  return normalizeEmail(userSnap?.data()?.email);
}

export async function findCallerCourseEnrollments(
  gateway: FirestoreGateway,
  callerUid: string,
  callerEmail: string,
  courseId: string
): Promise<Array<Record<string, any> & { id: string }>> {
  const enrollmentsSnap = await gateway.queryByField('enrollments', 'courseId', courseId);
  return enrollmentsSnap.docs
    .map((d) => ({ ...(d.data() || {}), id: d.id }) as Record<string, any> & { id: string })
    .filter((e) => {
      if (e.studentId === callerUid) return true;
      const invite = normalizeEmail(e.inviteEmail);
      return !!callerEmail && !!invite && invite === callerEmail;
    });
}

export function pickBestCourseEnrollment(
  matchingEnrollments: Array<Record<string, any> & { id: string }>
): Record<string, any> & { id: string } {
  return matchingEnrollments.reduce((best, cur) => {
    const bestScore =
      ((best.progressPercent as number) || 0) * 100 +
      ((best.progress?.completedModules as string[] | undefined)?.length ?? 0);
    const curScore =
      ((cur.progressPercent as number) || 0) * 100 +
      ((cur.progress?.completedModules as string[] | undefined)?.length ?? 0);
    return curScore > bestScore ? cur : best;
  });
}

export interface SyncCourseProgressParams {
  courseId: string;
  callerUid: string;
  callerEmail: string;
  completedModules: string[];
  evaluations: Record<string, { score?: number; feedback?: string; submittedAt?: string }>;
  progressPercent: number;
  moduleTitles: Map<string, string>;
  latestScore?: number;
  latestFeedback?: string;
}

export async function syncCourseAchievementsAndTasks(
  gateway: FirestoreGateway,
  params: SyncCourseProgressParams
): Promise<{ syncedTasks: number; achievementSaved: boolean }> {
  const {
    courseId,
    callerUid,
    callerEmail,
    completedModules,
    evaluations,
    progressPercent,
    moduleTitles,
    latestScore,
    latestFeedback,
  } = params;

  const nowIso = new Date().toISOString();
  let achievementSaved = false;

  if (progressPercent >= 100 && callerEmail) {
    const courseSnap = await gateway.getDoc('courses', courseId);
    const courseData = courseSnap?.data() || {};
    const evalEntries = Object.values(evaluations);
    const scores = evalEntries
      .map((e) => e?.score)
      .filter((s): s is number => typeof s === 'number');
    const finalScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : latestScore ?? 0;

    const moduleSummary = completedModules.map((modId) => {
      const ev = evaluations[modId];
      return {
        moduleId: modId,
        moduleTitle: moduleTitles.get(modId) || modId,
        score: ev?.score ?? 100,
        completedAt: ev?.submittedAt || nowIso,
      };
    });

    const achievementId = `${callerUid}_${courseId}`;
    const achievementData = {
      id: achievementId,
      studentId: callerUid,
      studentEmail: callerEmail,
      courseId,
      courseTitle: (courseData.title as string) || 'Curso',
      mentorId: (courseData.mentorId as string) || '',
      completedAt: nowIso,
      finalScore,
      moduleSummary,
    };

    if (gateway.mergeDoc) {
      await gateway.mergeDoc('student_achievements', achievementId, achievementData);
    } else {
      await gateway.createDoc('student_achievements', achievementId, achievementData);
    }
    achievementSaved = true;
  }

  const syncInput = {
    courseId,
    completedModules,
    progressPercent,
    score: latestScore,
    feedback: latestFeedback,
    nowIso,
  };

  let syncedTasks = 0;

  const fuByUid = await gateway.queryByField('followups', 'studentId', callerUid);
  const fuByEmail = callerEmail
    ? await gateway.queryByField('followups', 'studentEmail', callerEmail)
    : { docs: [] };

  const programMap = new Map<string, Record<string, unknown>>();
  for (const d of [...fuByUid.docs, ...fuByEmail.docs]) {
    const raw = d.data();
    if (raw) programMap.set(d.id, raw);
  }

  for (const [programId, programData] of programMap.entries()) {
    if (programData.type === 'group') continue;
    const tasksSnap = await gateway.listSubDocs('followups', programId, 'tasks');
    for (const tDoc of tasksSnap.docs) {
      const rawTask = tDoc.data() as Omit<LinkedTaskRecord, 'id'> | undefined;
      if (!rawTask) continue;
      const patch = computeTaskSyncPatch({ ...rawTask, id: tDoc.id }, syncInput);
      if (!patch) continue;
      await gateway.updateSubDoc('followups', programId, 'tasks', tDoc.id, {
        ...patch,
        updatedAt: gateway.serverTimestamp(),
      });
      syncedTasks++;
    }
  }

  const indSnap = await gateway.listSubDocs('users', callerUid, 'individualTasks');
  for (const tDoc of indSnap.docs) {
    const rawTask = tDoc.data() as Omit<LinkedTaskRecord, 'id'> | undefined;
    if (!rawTask) continue;
    const patch = computeTaskSyncPatch({ ...rawTask, id: tDoc.id }, syncInput);
    if (!patch) continue;
    await gateway.updateSubDoc('users', callerUid, 'individualTasks', tDoc.id, {
      ...patch,
      updatedAt: gateway.serverTimestamp(),
    });
    syncedTasks++;
  }

  return { syncedTasks, achievementSaved };
}

/**
 * Sincroniza el avance de un curso/módulo recién completado por el alumno con:
 * 1) Su historial académico permanente (`student_achievements/{uid}_{courseId}` si llega al 100%).
 * 2) Sus desafíos vinculados en mentorías 1-a-1 (`followups/{id}/tasks`).
 * 3) Sus tareas individuales (`users/{uid}/individualTasks`).
 * Las mentorías grupales NO se sobreescriben en Firestore para no afectar a otros alumnos.
 */
export async function handleSyncCourseProgress(
  gateway: FirestoreGateway,
  caller: Caller | null,
  courseId: string,
  rawBody: unknown
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!courseId?.trim()) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as SyncBody;
  const callerEmail = await resolveCallerEmail(gateway, caller);
  const matchingEnrollments = await findCallerCourseEnrollments(
    gateway,
    caller.uid,
    callerEmail,
    courseId
  );

  if (matchingEnrollments.length === 0) {
    return forbidden();
  }

  const bestEnrollment = pickBestCourseEnrollment(matchingEnrollments);

  const completedModules: string[] = Array.isArray(bestEnrollment.progress?.completedModules)
    ? bestEnrollment.progress.completedModules
    : [];
  const evaluations: Record<string, { score?: number; feedback?: string; submittedAt?: string }> =
    bestEnrollment.progress?.evaluations && !Array.isArray(bestEnrollment.progress.evaluations)
      ? bestEnrollment.progress.evaluations
      : {};

  const modulesSnap = await gateway.listSubDocs('courses', courseId, 'modules');
  const totalModules = modulesSnap.docs.length;
  let progressPercent =
    typeof bestEnrollment.progressPercent === 'number' ? bestEnrollment.progressPercent : 0;
  if (totalModules > 0) {
    const computed = Math.round((completedModules.length / totalModules) * 100);
    progressPercent = Math.max(progressPercent, Math.min(100, computed));
  }

  const moduleTitles = new Map<string, string>();
  for (const mDoc of modulesSnap.docs) {
    const mData = mDoc.data();
    if (mData?.title && typeof mData.title === 'string') {
      moduleTitles.set(mDoc.id, mData.title);
    }
  }

  const moduleEval = body.moduleId ? evaluations[body.moduleId] : undefined;
  const latestScore =
    typeof moduleEval?.score === 'number'
      ? moduleEval.score
      : typeof body.score === 'number'
      ? body.score
      : undefined;
  const latestFeedback =
    typeof moduleEval?.feedback === 'string'
      ? moduleEval.feedback
      : typeof body.feedback === 'string'
      ? body.feedback
      : undefined;

  const { syncedTasks, achievementSaved } = await syncCourseAchievementsAndTasks(gateway, {
    courseId,
    callerUid: caller.uid,
    callerEmail,
    completedModules,
    evaluations,
    progressPercent,
    moduleTitles,
    latestScore,
    latestFeedback,
  });

  return NextResponse.json({
    data: {
      syncedTasks,
      achievementSaved,
      progressPercent,
    },
  });
}
