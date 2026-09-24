/**
 * Tests de handlers del detalle (sesiones/tareas) con gateway falso.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import {
  handleAddSession,
  handleAssignTask,
  handleDeleteTask,
  handleGetProgram,
  handleListSessions,
  handleListTasks,
  handleSaveSession,
  handleSubmitTask,
  handleTaskProgress,
} from '../program-detail-handlers';

describe('acceso alumno', () => {
  it('directo lee y entrega, pero no guarda sesiones', async () => {
    const gateway = setup();
    expect((await handleGetProgram(gateway, studentDirect, 'fDirect')).status).toBe(200);
    expect((await handleListSessions(gateway, studentDirect, 'fDirect')).status).toBe(200);
    expect((await handleListTasks(gateway, studentDirect, 'fDirect')).status).toBe(200);

    const submit = await handleSubmitTask(gateway, studentDirect, 'fDirect', 't1', {
      answer: 'R',
      score: 70,
    });
    expect(submit.status).toBe(200);

    expect(
      (await handleSaveSession(gateway, studentDirect, 'fDirect', { sessionId: 's1' })).status,
    ).toBe(403);
    expect((await handleAddSession(gateway, studentDirect, 'fDirect')).status).toBe(403);
  });

  it('grupal inscripto lee; ajeno recibe 403', async () => {
    const gateway = setup();
    expect((await handleGetProgram(gateway, studentGroup, 'fGroup')).status).toBe(200);
    expect((await handleGetProgram(gateway, stranger, 'fGroup')).status).toBe(403);
    expect((await handleListTasks(gateway, stranger, 'f1')).status).toBe(403);
  });
});

class FakeGateway implements FirestoreGateway {
  constructor(readonly store: Record<string, Record<string, RawDoc> | unknown>) {}

  private docsOf(key: string): Record<string, RawDoc> {
    return (this.store[key] as Record<string, RawDoc> | undefined) ?? {};
  }

  async getDoc(collectionPath: string, id: string) {
    const raw = (this.store[collectionPath] as Record<string, RawDoc> | undefined)?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField(collectionPath: string, field: string, value: unknown) {
    const docs = Object.entries(this.docsOf(collectionPath))
      .filter(([, raw]) => raw[field] === value)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }

  async updateDoc(): Promise<void> {}
  async deleteDoc(): Promise<void> {}
  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }
  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }
  async createDoc(): Promise<void> {}

  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const docs = Object.entries(this.docsOf(`${parentCollection}/${parentId}/${subCollection}`)).map(
      ([id, raw]) => ({ exists: true as const, id, data: () => raw }),
    );
    return { docs };
  }

  async countSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    return Object.keys(this.docsOf(`${parentCollection}/${parentId}/${subCollection}`)).length;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    this.store[key] = { ...this.docsOf(key), [id]: data };
  }

  async updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    const docs = this.store[key] as Record<string, RawDoc>;
    this.store[key] = { ...docs, [id]: { ...docs[id], ...patch } };
  }

  async deleteSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
  ): Promise<void> {
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    const docs = { ...this.docsOf(key) };
    delete docs[id];
    this.store[key] = docs;
  }

  async listDocs(collectionPath: string) {
    const docs = Object.entries(
      (this.store[collectionPath] as Record<string, RawDoc> | undefined) ?? {},
    ).map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }
}

function setup() {
  return new FakeGateway({
    followups: {
      f1: {
        mentorId: 'm1',
        title: 'P',
        type: 'individual',
        studentId: 's1',
        totalSessions: 1,
        status: 'active',
      },
      fDirect: {
        mentorId: 'm1',
        title: 'Directa',
        type: 'individual',
        studentId: 's9',
        totalSessions: 1,
        status: 'active',
      },
      fGroup: {
        mentorId: 'm1',
        title: 'Grupal',
        type: 'group',
        studentId: '',
        totalSessions: 1,
        status: 'active',
      },
    },
    users: {
      s9: { email: 's9@x.com' },
      sGroup: { email: 'sgroup@x.com' },
      stranger: { email: 'stranger@x.com' },
    },
    enrollments: [
      { studentId: 'sGroup', courseId: 'fGroup' },
    ] as unknown as Record<string, RawDoc>,
    'followups/f1/sessions': {
      s1: { followUpId: 'f1', orderIndex: 1, isCompleted: false, status: 'pending' },
    },
    'followups/f1/tasks': {
      t1: { title: 'T1', status: 'pending', progress: 0 },
    },
    'followups/fDirect/sessions': {},
    'followups/fDirect/tasks': {
      t1: { title: 'T1', status: 'pending', progress: 0 },
    },
    'followups/fGroup/sessions': {},
    'followups/fGroup/tasks': {},
  });
}

const mentor: Caller = { uid: 'm1', isAdmin: false };
const other: Caller = { uid: 'm2', isAdmin: false };
const studentDirect: Caller = { uid: 's9', isAdmin: false };
const studentGroup: Caller = { uid: 'sGroup', isAdmin: false };
const stranger: Caller = { uid: 'stranger', isAdmin: false };

describe('authz del detalle', () => {
  it('401 sin llamante, 403 ajeno, 404 inexistente', async () => {
    const gateway = setup();
    expect((await handleGetProgram(gateway, null, 'f1')).status).toBe(401);
    expect((await handleGetProgram(gateway, other, 'f1')).status).toBe(403);
    expect((await handleGetProgram(gateway, mentor, 'missing')).status).toBe(404);
    expect((await handleGetProgram(gateway, mentor, 'f1')).status).toBe(200);
  });
});

describe('handleDeleteTask', () => {
  it('401/403 y borra el mentor', async () => {
    const gateway = setup();
    expect((await handleDeleteTask(gateway, null, 'f1', 't1')).status).toBe(401);
    expect((await handleDeleteTask(gateway, other, 'f1', 't1')).status).toBe(403);
    expect((await handleDeleteTask(gateway, mentor, 'f1', 't1')).status).toBe(200);
    expect(
      Object.keys(
        (gateway.store['followups/f1/tasks'] as Record<string, RawDoc> | undefined) ?? {},
      ),
    ).toHaveLength(0);
  });
});

describe('sesiones', () => {
  it('lista, guarda con estado derivado y añade extra', async () => {
    const gateway = setup();
    const list = await handleListSessions(gateway, mentor, 'f1');
    expect(list.status).toBe(200);
    expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(1);

    const save = await handleSaveSession(gateway, mentor, 'f1', {
      sessionId: 's1',
      date: '2026-01-01',
      time: '10:00',
    });
    expect(save.status).toBe(200);
    expect(
      (gateway.store['followups/f1/sessions'] as Record<string, RawDoc>).s1.status,
    ).toBe('scheduled');

    const add = await handleAddSession(gateway, mentor, 'f1');
    expect(add.status).toBe(200);
    expect(Object.keys(gateway.store['followups/f1/sessions'] as object)).toHaveLength(2);
  });
});

describe('tareas', () => {
  it('lista, asigna, entrega y actualiza progreso', async () => {
    const gateway = setup();
    expect((await handleListTasks(gateway, mentor, 'f1')).status).toBe(200);

    const assign = await handleAssignTask(gateway, mentor, 'f1', {
      id: 't9',
      type: 'free',
      title: 'Desafío',
    });
    expect(assign.status).toBe(200);

    const submit = await handleSubmitTask(gateway, mentor, 'f1', 't9', {
      answer: 'R',
      score: 90,
    });
    expect(submit.status).toBe(200);
    const stored = (gateway.store['followups/f1/tasks'] as Record<string, RawDoc>).t9;
    expect(stored).toMatchObject({ progress: 100, status: 'completed', score: 90 });

    const prog = await handleTaskProgress(gateway, mentor, 'f1', 't1', {
      progress: 30,
      status: 'pending',
    });
    expect(prog.status).toBe(200);
    expect((gateway.store['followups/f1/tasks'] as Record<string, RawDoc>).t1.progress).toBe(30);
  });

  it('asignación inválida → 400', async () => {
    const gateway = setup();
    const res = await handleAssignTask(gateway, mentor, 'f1', { type: 'free', title: '' });
    expect(res.status).toBe(400);
  });
});
