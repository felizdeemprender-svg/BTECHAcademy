import { describe, expect, it } from 'vitest';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '@/lib/api/mentor-auth';
import { handleSubmitCourseQuiz } from '@/lib/api/course-quiz-submit';

class FakeQuizGateway implements FirestoreGateway {
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

const caller: Caller = {
  uid: 'student-1',
  email: 'alumno@test.com',
  isAdmin: false,
};

function createBaseGateway() {
  return new FakeQuizGateway(
    {
      users: {
        'student-1': { uid: 'student-1', email: 'alumno@test.com', displayName: 'Alumno Test' },
      },
      courses: {
        c1: { title: 'Recursos para crecer', mentorId: 'mentor-1' },
      },
      enrollments: {
        e1: {
          courseId: 'c1',
          studentId: 'pending_invite',
          inviteEmail: 'alumno@test.com',
          progress: { completedModules: [], evaluations: {} },
          progressPercent: 0,
        },
      },
      followups: {
        f1: { studentId: 'student-1', type: '1on1', mentorId: 'mentor-1' },
        fGroup: {
          type: 'group',
          studentUids: ['student-1'],
          studentEmails: ['alumno@test.com'],
        },
      },
    },
    {
      'courses/c1/modules': {
        m1: {
          title: 'Modulo 1',
          minPassingScore: 10,
          allowRetries: true,
          questions: [
            {
              text: '¿Qué te ha parecido este material?',
              type: 'multiple_choice',
              options: ['Muy bueno', 'Bueno', 'Regular', 'No me sirvio'],
              correctAnswer: 0,
            },
          ],
        },
      },
      'followups/f1/tasks': {
        t1: { type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
      },
      'followups/fGroup/tasks': {
        tg1: { type: 'course', courseId: 'c1', status: 'pending', progress: 0 },
      },
      'users/student-1/individualTasks': {
        it1: { type: 'module', courseId: 'c1', moduleId: 'm1', status: 'pending', progress: 0 },
      },
    }
  );
}

describe('handleSubmitCourseQuiz', () => {
  it('retorna 401 si no hay usuario autenticado', async () => {
    const gateway = createBaseGateway();
    const res = await handleSubmitCourseQuiz(gateway, null, 'c1', { moduleId: 'm1', answers: { '0': 0 } });
    expect(res.status).toBe(401);
  });

  it('retorna 403 si el alumno no está inscrito en el curso', async () => {
    const gateway = createBaseGateway();
    const otherCaller: Caller = { uid: 'other-user', email: 'other@test.com', isAdmin: false };
    const res = await handleSubmitCourseQuiz(gateway, otherCaller, 'c1', {
      moduleId: 'm1',
      answers: { '0': 0 },
    });
    expect(res.status).toBe(403);
  });

  it('retorna 400 cuando faltan respuestas obligatorias', async () => {
    const gateway = createBaseGateway();
    const res = await handleSubmitCourseQuiz(gateway, caller, 'c1', {
      moduleId: 'm1',
      answers: {},
    });
    expect(res.status).toBe(400);
  });

  it('persiste intento, progreso 100%, logro y tareas de mentoría vinculadas al aprobar', async () => {
    const gateway = createBaseGateway();
    const res = await handleSubmitCourseQuiz(
      gateway,
      caller,
      'c1',
      { moduleId: 'm1', answers: { '0': 0 } },
      async () => ({
        score: 100,
        feedback: 'Excelente respuesta',
        strengths: ['Criterio claro'],
        areasToImprove: [],
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isPassing).toBe(true);
    expect(body.data.progressPercent).toBe(100);
    expect(body.data.completedModules).toEqual(['m1']);
    expect(body.data.syncedTasks).toBe(2);
    expect(body.data.achievementSaved).toBe(true);

    expect(Object.keys(gateway.store.quiz_attempts ?? {})).toHaveLength(1);
    expect(gateway.store.enrollments.e1.progressPercent).toBe(100);
    expect((gateway.store.enrollments.e1.progress as Record<string, any>).completedModules).toEqual(['m1']);
    expect(gateway.store.student_achievements['student-1_c1']).toMatchObject({
      studentId: 'student-1',
      courseId: 'c1',
      finalScore: 100,
    });
    expect(gateway.subStore['followups/f1/tasks'].t1.status).toBe('completed');
    expect(gateway.subStore['followups/f1/tasks'].t1.progress).toBe(100);
    expect(gateway.subStore['users/student-1/individualTasks'].it1.status).toBe('completed');
    // Seguimiento grupal no se sobrescribe para todos los miembros
    expect(gateway.subStore['followups/fGroup/tasks'].tg1.status).toBe('pending');
  });

  it('registra quiz_attempts y feedback sin completar módulo cuando no supera minPassingScore', async () => {
    const gateway = createBaseGateway();
    const res = await handleSubmitCourseQuiz(
      gateway,
      caller,
      'c1',
      { moduleId: 'm1', answers: { '0': 1 } },
      async () => ({
        score: 0,
        feedback: 'Respuesta no esperada',
        strengths: [],
        areasToImprove: ['Revisar opción correcta'],
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isPassing).toBe(false);
    expect(body.data.progressPercent).toBe(0);
    expect(body.data.completedModules).toEqual([]);
    expect(body.data.syncedTasks).toBe(0);
    expect(body.data.achievementSaved).toBe(false);

    expect(Object.keys(gateway.store.quiz_attempts ?? {})).toHaveLength(1);
    expect(gateway.store.enrollments.e1.progressPercent).toBe(0);
    expect((gateway.store.enrollments.e1.progress as Record<string, any>).evaluations.m1.score).toBe(0);
    expect(gateway.subStore['followups/f1/tasks'].t1.status).toBe('pending');
  });
});
