/**
 * Tests de handlers CRUD de programas con gateway falso.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import {
  handleCreateProgram,
  handleDeleteProgram,
  handleListPrograms,
  handlePatchProgram,
} from '../program-handlers';

const admin: Caller = { uid: 'admin1', isAdmin: true };

class FakeGateway implements FirestoreGateway {
  created: { collectionPath: string; id: string }[] = [];
  constructor(readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField(collectionPath: string, field: string, value: unknown) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
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

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.created.push({ collectionPath, id });
    this.store[collectionPath][id] = data;
  }

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
    const key = `${parentCollection}/${parentId}/${subCollection}`;
    this.store[key] = { ...(this.store[key] as Record<string, RawDoc>), [id]: data };
  }

  async deleteSubDoc(parentCollection: string, parentId: string, subCollection: string, id: string) {
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
        totalSessions: 1,
        status: 'active',
      },
    },
    'followups/f1/sessions': {},
    'followups/f1/tasks': {},
  });
}

const mentor: Caller = { uid: 'm1', isAdmin: false };
const other: Caller = { uid: 'm2', isAdmin: false };

describe('handleListPrograms', () => {
  it('401/403 y 200 propio', async () => {
    const gateway = setup();
    expect((await handleListPrograms(gateway, null, 'm1')).status).toBe(401);
    expect((await handleListPrograms(gateway, other, 'm1')).status).toBe(403);
    const res = await handleListPrograms(gateway, mentor, 'm1');
    expect(res.status).toBe(200);
  });
});

describe('handleListPrograms all=1', () => {
  it('admin ve todos, mentor recibe 403', async () => {
    const gateway = setup();
    const res = await handleListPrograms(gateway, admin, '', true);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { program: { id: string } }[] };
    expect(body.data.map((s) => s.program.id)).toEqual(['f1']);
    expect((await handleListPrograms(gateway, mentor, '', true)).status).toBe(403);
  });
});

describe('handleCreateProgram', () => {
  it('401/403 (mentorId ajeno) y 200 creando sesiones', async () => {
    const gateway = setup();
    expect((await handleCreateProgram(gateway, null, {})).status).toBe(401);
    expect(
      (await handleCreateProgram(gateway, other, { mentorId: 'm1', title: 'X' })).status,
    ).toBe(403);

    const res = await handleCreateProgram(gateway, mentor, {
      id: 'f9',
      mentorId: 'm1',
      type: 'individual',
      title: 'Nueva',
      studentId: 's9',
      totalSessions: 2,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data).toEqual({ id: 'f9' });
    expect(gateway.created.map((c) => c.collectionPath)).toEqual(['followups']);
    expect(Object.keys(gateway.store['followups/f9/sessions'] ?? {})).toHaveLength(2);
  });
});

describe('handlePatchProgram', () => {
  it('401/403/404 y 200 (status y campos)', async () => {
    const gateway = setup();
    expect((await handlePatchProgram(gateway, null, 'f1', {})).status).toBe(401);
    expect((await handlePatchProgram(gateway, other, 'f1', {})).status).toBe(403);
    expect((await handlePatchProgram(gateway, mentor, 'missing', {})).status).toBe(404);

    expect((await handlePatchProgram(gateway, mentor, 'f1', { status: 'suspended' })).status).toBe(
      200,
    );
    expect(gateway.store.followups.f1.status).toBe('suspended');
    expect((await handlePatchProgram(gateway, mentor, 'f1', { title: 'T2' })).status).toBe(200);
    expect(gateway.store.followups.f1.title).toBe('T2');
  });
});

describe('handleDeleteProgram', () => {
  it('401/403/404, bloquea con tareas y borra sin tareas', async () => {
    const gateway = setup();
    expect((await handleDeleteProgram(gateway, null, 'f1')).status).toBe(401);
    expect((await handleDeleteProgram(gateway, other, 'f1')).status).toBe(403);
    expect((await handleDeleteProgram(gateway, mentor, 'missing')).status).toBe(404);

    gateway.store['followups/f1/tasks'] = { t1: { title: 'T' } };
    const blocked = await handleDeleteProgram(gateway, mentor, 'f1');
    expect(blocked.status).toBe(400);
    expect(gateway.store.followups.f1).toBeDefined();

    delete gateway.store['followups/f1/tasks'].t1;
    const res = await handleDeleteProgram(gateway, mentor, 'f1');
    expect(res.status).toBe(200);
    expect(gateway.store.followups.f1).toBeUndefined();
  });
});
