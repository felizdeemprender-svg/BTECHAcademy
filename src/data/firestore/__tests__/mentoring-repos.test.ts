/**
 * Tests de repos de programas/sesiones/tareas con gateway falso.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway } from '../gateway';
import type { RawDoc } from '../mappers';
import { FirestoreMentoringProgramRepository } from '../program-repo';
import { FirestoreSessionRepository } from '../session-repo';
import { FirestoreTaskRepository } from '../task-repo';

class FakeGateway implements FirestoreGateway {
  writes: { kind: string; args: unknown[] }[] = [];
  constructor(private readonly store: Record<string, unknown>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = (this.store[collectionPath] as Record<string, RawDoc> | undefined)?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField(collectionPath: string, field: string, value: unknown) {
    const docs = Object.entries(
      (this.store[collectionPath] as Record<string, RawDoc> | undefined) ?? {},
    )
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
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    const docs = Object.entries((this.store[key] as Record<string, RawDoc> | undefined) ?? {}).map(
      ([id, raw]) => ({ exists: true as const, id, data: () => raw }),
    );
    return { docs };
  }

  async countSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    return Object.keys((this.store[key] as Record<string, RawDoc> | undefined) ?? {}).length;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    this.writes.push({ kind: 'createSubDoc', args: [parentCollection, parentId, subCollection, id, data] });
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    this.store[key] = { ...(this.store[key] as Record<string, RawDoc>), [id]: data };
  }

  async deleteSubDoc(parentCollection: string, parentId: string, subCollection: string, id: string) {
    this.writes.push({ kind: 'deleteSubDoc', args: [parentCollection, parentId, subCollection, id] });
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    delete (this.store[key] as Record<string, RawDoc>)[id];
  }

  async updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>,
  ) {
    this.writes.push({ kind: 'updateSubDoc', args: [parentCollection, parentId, subCollection, id, patch] });
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    const docs = this.store[key] as Record<string, RawDoc>;
    this.store[key] = { ...docs, [id]: { ...docs[id], ...patch } };
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
        totalSessions: 2,
        status: 'active',
      },
    },
    'followups/f1/sessions': {
      s1: { followUpId: 'f1', orderIndex: 1, isCompleted: true, status: 'completed' },
      s2: { followUpId: 'f1', orderIndex: 2, isCompleted: false, status: 'pending' },
    },
    'followups/f1/tasks': {
      t1: { title: 'T1', status: 'pending', progress: 0 },
    },
  });
}

describe('program/session/task repos', () => {
  it('listAll devuelve todos', async () => {
    const gateway = setup();
    const programs = new FirestoreMentoringProgramRepository(gateway);
    expect((await programs.listAll()).map((p) => p.id)).toEqual(['f1']);
  });

  it('lista programas, sesiones y cuenta tareas', async () => {
    const gateway = setup();
    const programs = new FirestoreMentoringProgramRepository(gateway);
    const sessions = new FirestoreSessionRepository(gateway);
    const tasks = new FirestoreTaskRepository(gateway);

    expect((await programs.listByMentor('m1')).map((p) => p.id)).toEqual(['f1']);
    expect((await sessions.listByProgram('f1')).map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(await tasks.countByProgram('f1')).toBe(1);
    expect((await tasks.listByProgram('f1'))[0].title).toBe('T1');
  });

  it('createMany escribe sesiones iniciales idénticas a la página', async () => {
    const gateway = setup();
    const sessions = new FirestoreSessionRepository(gateway);
    await sessions.createMany('f1', [
      { id: 'n1', followUpId: 'f1', orderIndex: 3 },
    ]);
    const write = gateway.writes.find((w) => w.kind === 'createSubDoc');
    expect(write?.args.slice(0, 4)).toEqual(['followups', 'f1', 'sessions', 'n1']);
    expect(write?.args[4]).toMatchObject({
      id: 'n1',
      followUpId: 'f1',
      orderIndex: 3,
      isCompleted: false,
      status: 'pending',
      topics: [],
      minutes: '',
    });
  });

  it('task remove borra', async () => {
    const gateway = setup();
    const tasks = new FirestoreTaskRepository(gateway);
    await tasks.remove('f1', 't1');
    expect(await tasks.countByProgram('f1')).toBe(0);
  });

  it('removeAllByProgram borra y cuenta', async () => {
    const gateway = setup();
    const sessions = new FirestoreSessionRepository(gateway);
    expect(await sessions.removeAllByProgram('f1')).toBe(2);
    expect(await sessions.listByProgram('f1')).toHaveLength(0);
  });
});
