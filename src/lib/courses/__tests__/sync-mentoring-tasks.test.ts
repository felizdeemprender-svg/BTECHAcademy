import { describe, expect, it } from 'vitest';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '@/lib/api/mentor-auth';
import { handleSyncCourseProgress } from '@/lib/api/course-progress-sync';
import {
  computeTaskSyncPatch,
  enrichLinkedTasksWithEnrollments,
  type LinkedTaskRecord,
} from '../sync-mentoring-tasks';

class FakeSyncGateway implements FirestoreGateway {
  constructor(
    readonly store: Record<string, Record<string, RawDoc>>,
    readonly subStore: Record<string, Record<string, RawDoc>> = {}
  ) {}

  private subKey(parentCollection: string, parentId: string, subCollection: string) {
    return `${parentCollection}/${parentId}/${subCollection}`;
  }

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async listDocs(collectionPath: string) {
    const docs = Object.entries(this.store[collectionPath] ?? {}).map(([id, raw]) => ({
      exists: true as const,
      id,
      data: () => raw,
    }));
    return { docs };
  }

  async queryByField(collectionPath: string, field: string, value: unknown) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }

  async mergeDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.store[collectionPath] = this.store[collectionPath] ?? {};
    this.store[collectionPath][id] = { ...(this.store[collectionPath][id] ?? {}), ...data };
  }

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.store[collectionPath] = this.store[collectionPath] ?? {};
    this.store[collectionPath][id] = data;
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>) {
    this.store[collectionPath][id] = { ...this.store[collectionPath][id], ...patch };
  }

  async deleteDoc(collectionPath: string, id: string) {
    delete this.store[collectionPath][id];
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const key = this.subKey(parentCollection, parentId, subCollection);
    const docs = Object.entries(this.subStore[key] ?? {}).map(([id, raw]) => ({
      exists: true as const,
      id,
      data: () => raw,
    }));
    return { docs };
  }

  async countSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const key = this.subKey(parentCollection, parentId, subCollection);
    return Object.keys(this.subStore[key] ?? {}).length;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>
  ) {
    const key = this.subKey(parentCollection, parentId, subCollection);
    this.subStore[key] = this.subStore[key] ?? {};
    this.subStore[key][id] = data;
  }

  async updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>
  ) {
    const key = this.subKey(parentCollection, parentId, subCollection);
    this.subStore[key] = this.subStore[key] ?? {};
    this.subStore[key][id] = { ...(this.subStore[key][id] ?? {}), ...patch };
  }

  async deleteSubDoc(parentCollection: string, parentId: string, subCollection: string, id: string) {
    const key = this.subKey(parentCollection, parentId, subCollection);
    delete this.subStore[key]?.[id];
  }
}

describe('computeTaskSyncPatch & enrichLinkedTasksWithEnrollments', () => {
  it('completes course and module linked tasks when content reaches 100% / module completed', () => {
    const nowIso = '2026-11-11T19:00:00.000Z';
    const coursePatch = computeTaskSyncPatch(
      { id: 't1', type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
      {
        courseId: 'c1',
        completedModules: ['m1'],
        progressPercent: 100,
        score: 95,
        feedback: 'Excelente',
        nowIso,
      }
    );
    expect(coursePatch).toEqual({
      progress: 100,
      status: 'completed',
      completedAt: nowIso,
      score: 95,
      aiFeedback: 'Excelente',
    });

    const modPatch = computeTaskSyncPatch(
      { id: 't2', type: 'module', courseId: 'c1', moduleId: 'm1', status: 'pending', progress: 0 },
      {
        courseId: 'c1',
        completedModules: ['m1'],
        progressPercent: 50,
        score: 90,
        feedback: 'Bien',
        nowIso,
      }
    );
    expect(modPatch).toEqual({
      progress: 100,
      status: 'completed',
      completedAt: nowIso,
      score: 90,
      aiFeedback: 'Bien',
    });
  });

  it('enriches student tasks in memory (including shared group tasks) from enrollments', () => {
    const tasks: LinkedTaskRecord[] = [
      { id: 't-group', type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
      { id: 't-free', type: 'free', status: 'pending', progress: 0 },
    ];
    const enriched = enrichLinkedTasksWithEnrollments(tasks, [
        {
          courseId: 'c1',
          progressPercent: 100,
          progress: {
            completedModules: ['m1'],
            evaluations: {
              m1: { score: 100, feedback: 'Perfecto', submittedAt: '2026-11-11T19:00:00.000Z' },
            },
          },
        },
      ]
    );

    expect(enriched[0].status).toBe('completed');
    expect(enriched[0].progress).toBe(100);
    expect(enriched[0].score).toBe(100);
    expect(enriched[1].status).toBe('pending');
  });
});

describe('handleSyncCourseProgress', () => {
  const student: Caller = { uid: 'stu1', email: 'alumno@test.com', isAdmin: false };

  it('returns 401 when unauthenticated', async () => {
    const gw = new FakeSyncGateway({});
    const res = await handleSyncCourseProgress(gw, null, 'c1', {});
    expect(res.status).toBe(401);
  });

  it('returns 403 when student has no matching enrollment for course', async () => {
    const gw = new FakeSyncGateway({
      users: { stu1: { email: 'alumno@test.com' } },
      enrollments: {},
    });
    const res = await handleSyncCourseProgress(gw, student, 'c1', {});
    expect(res.status).toBe(403);
  });

  it('syncs 1-on-1 followups, individualTasks, and student_achievements while leaving group tasks untouched', async () => {
    const gw = new FakeSyncGateway(
      {
        users: { stu1: { email: 'alumno@test.com' } },
        courses: { c1: { title: 'Recursos para crecer', mentorId: 'm1' } },
        enrollments: {
          e1: {
            courseId: 'c1',
            studentId: 'stu1',
            inviteEmail: 'alumno@test.com',
            progressPercent: 100,
            progress: {
              completedModules: ['mod1'],
              evaluations: {
                mod1: { score: 100, feedback: 'Aprobado', submittedAt: '2026-11-11T19:00:00.000Z' },
              },
            },
          },
        },
        followups: {
          fu1: { studentId: 'stu1', studentEmail: 'alumno@test.com', type: '1on1', mentorId: 'm1' },
          fuGroup: { studentId: '', type: 'group', mentorId: 'm1' },
        },
      },
      {
        'courses/c1/modules': {
          mod1: { title: 'Introducción a Canva' },
        },
        'followups/fu1/tasks': {
          t1: { type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
        },
        'followups/fuGroup/tasks': {
          tg1: { type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
        },
        'users/stu1/individualTasks': {
          ti1: { type: 'module', courseId: 'c1', moduleId: 'mod1', status: 'pending', progress: 0 },
        },
      }
    );

    const res = await handleSyncCourseProgress(gw, student, 'c1', {
      moduleId: 'mod1',
      score: 100,
      feedback: 'Aprobado',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({
      syncedTasks: 2,
      achievementSaved: true,
      progressPercent: 100,
    });

    expect(gw.subStore['followups/fu1/tasks']['t1'].status).toBe('completed');
    expect(gw.subStore['followups/fu1/tasks']['t1'].progress).toBe(100);
    expect(gw.subStore['users/stu1/individualTasks']['ti1'].status).toBe('completed');
    expect(gw.subStore['followups/fuGroup/tasks']['tg1'].status).toBe('pending');
    expect(gw.store['student_achievements']['stu1_c1'].finalScore).toBe(100);
  });
});
