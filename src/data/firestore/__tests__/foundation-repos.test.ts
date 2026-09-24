/**
 * Tests de repositorios fundacionales F2.1 (catalog/commerce/identity)
 * con gateway falso en memoria. Sin Firebase real: el falso implementa
 * FirestoreGateway. TDD: este archivo se creó primero (rojo) y luego
 * las implementaciones (verde).
 */
import { describe, expect, it, vi } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '../gateway';
import {
  mapCourseDoc,
  mapEnrollmentDoc,
  mapLeadDoc,
  mapUserDoc,
  type RawDoc,
} from '../mappers';
import { FirestoreCourseRepository } from '../course-repo';
import { FirestoreEnrollmentRepository } from '../enrollment-repo';
import { FirestoreLeadRepository } from '../lead-repo';
import { FirestoreUserRepository } from '../user-repo';

function docSnap(id: string, raw: RawDoc | undefined): DocSnapshotLike | null {
  if (raw === undefined) return null;
  return { exists: true, id, data: () => raw };
}

class FakeGateway implements FirestoreGateway {
  calls: { collectionPath: string; field?: string; value?: unknown; limit?: number }[] = [];
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null> {
    this.calls.push({ collectionPath });
    return docSnap(id, this.store[collectionPath]?.[id]);
  }

  async queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    this.calls.push({ collectionPath, field, value, limit });
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => (raw as RawDoc)[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async updateDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async deleteDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async createDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
}

const courseRaw: RawDoc = {
  mentorId: 'm1',
  title: 'Curso X',
  categoryId: 'cat1',
  status: 'published',
  createdAt: { seconds: Date.parse('2026-01-01T00:00:00.000Z') / 1000 },
};

const enrollmentRaw: RawDoc = {
  courseId: 'c1',
  productId: 'c1',
  productType: 'course',
  mentorId: 'm1',
  inviteEmail: 'alumno@example.com',
  studentId: 's1',
  status: 'active',
  createdAt: { toDate: () => new Date('2026-02-01T00:00:00.000Z') },
};

const leadRaw: RawDoc = {
  landingId: 'lp1',
  courseId: 'c1',
  referidoId: null,
  studentName: 'Ana',
  studentEmail: 'ana@example.com',
  status: 'pending',
  createdAt: '2026-03-01T00:00:00.000Z',
};

const userRaw: RawDoc = {
  email: 'tutor@example.com',
  displayName: 'Tutor X',
  username: 'tutorx',
  roles: ['mentor'],
  isMentor: true,
  isActive: true,
  createdAt: { seconds: Date.parse('2026-01-15T00:00:00.000Z') / 1000 },
};

describe('mappers fundacionales', () => {
  it('mapCourseDoc normaliza fechas y asigna id', () => {
    const c = mapCourseDoc('c1', courseRaw);
    expect(c.id).toBe('c1');
    expect(c.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('mapEnrollmentDoc normaliza toDate() a Date', () => {
    const e = mapEnrollmentDoc('e1', enrollmentRaw);
    expect(e.id).toBe('e1');
    expect(e.createdAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });

  it('mapLeadDoc normaliza ISO string a Date', () => {
    const l = mapLeadDoc('l1', leadRaw);
    expect(l.id).toBe('l1');
    expect(l.createdAt).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });

  it('mapUserDoc mapea doc-id a uid', () => {
    const u = mapUserDoc('uid123', userRaw);
    expect(u.uid).toBe('uid123');
    expect(u.createdAt).toEqual(new Date('2026-01-15T00:00:00.000Z'));
  });

  it('mappers hacen throw con documentos inválidos', () => {
    expect(() => mapCourseDoc('x', { title: '' })).toThrow();
    expect(() => mapEnrollmentDoc('x', { courseId: '' })).toThrow();
    expect(() => mapLeadDoc('x', { studentName: '' })).toThrow();
    expect(() => mapUserDoc('x', { email: 'no-es-email' })).toThrow();
  });
});

describe('FirestoreCourseRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      courses: {
        c1: courseRaw,
        cOther: { ...courseRaw, mentorId: 'm2' },
        cBad: { mentorId: 'm1', title: '' },
      },
    });
    return { gateway, repo: new FirestoreCourseRepository(gateway) };
  }

  it('findById devuelve el curso y null si no existe', async () => {
    const { repo } = setup();
    expect((await repo.findById('c1'))?.title).toBe('Curso X');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByMentor filtra por mentor en courses y omite corruptos con warn', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listByMentor('m1');
      expect(list.map((c) => c.id)).toEqual(['c1']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'courses', field: 'mentorId', value: 'm1' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('listByMentor respeta limit', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await repo.listByMentor('m1', 10);
      expect(gateway.calls[0].limit).toBe(10);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreEnrollmentRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      enrollments: {
        e1: enrollmentRaw,
        eOther: { ...enrollmentRaw, courseId: 'c9', productId: 'c9' },
        eBad: { courseId: 'c1', productId: 'c1' },
      },
    });
    return { gateway, repo: new FirestoreEnrollmentRepository(gateway) };
  }

  it('findById devuelve la inscripción y null si no existe', async () => {
    const { repo } = setup();
    expect((await repo.findById('e1'))?.studentId).toBe('s1');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByCourse filtra por courseId en enrollments y omite corruptos con warn', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listByCourse('c1');
      expect(list.map((e) => e.id)).toEqual(['e1']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'enrollments', field: 'courseId', value: 'c1' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('listByCourse respeta limit', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await repo.listByCourse('c1', 5);
      expect(gateway.calls[0].limit).toBe(5);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreLeadRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      leads: {
        l1: leadRaw,
        lOther: { ...leadRaw, courseId: 'c9' },
        lBad: { courseId: 'c1', studentName: '' },
      },
    });
    return { gateway, repo: new FirestoreLeadRepository(gateway) };
  }

  it('findById devuelve el lead y null si no existe', async () => {
    const { repo } = setup();
    expect((await repo.findById('l1'))?.studentName).toBe('Ana');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByCourse filtra por courseId en leads y omite corruptos con warn', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listByCourse('c1');
      expect(list.map((l) => l.id)).toEqual(['l1']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'leads', field: 'courseId', value: 'c1' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('listByCourse respeta limit', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await repo.listByCourse('c1', 5);
      expect(gateway.calls[0].limit).toBe(5);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreUserRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      users: {
        uid123: userRaw,
        uidOther: { ...userRaw, username: 'otro' },
      },
    });
    return { gateway, repo: new FirestoreUserRepository(gateway) };
  }

  it('findById devuelve el usuario con uid del doc y null si no existe', async () => {
    const { repo } = setup();
    const found = await repo.findById('uid123');
    expect(found?.uid).toBe('uid123');
    expect(found?.email).toBe('tutor@example.com');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('findByUsername consulta users where username == con límite 1', async () => {
    const { gateway, repo } = setup();
    const found = await repo.findByUsername('tutorx');
    expect(found?.uid).toBe('uid123');
    expect(gateway.calls[0]).toMatchObject({
      collectionPath: 'users',
      field: 'username',
      value: 'tutorx',
      limit: 1,
    });
  });

  it('findByUsername retorna null si no hay match', async () => {
    const { repo } = setup();
    expect(await repo.findByUsername('nadie')).toBeNull();
  });
});
