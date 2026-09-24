/**
 * F1.2 (TDD rojo) — Repos de catálogo con gateway falso en memoria.
 * Aserta colecciones y filtros EXACTOS del legacy:
 * - courses: isActive==true + status==published + publicListing==true (+ price==0/>0) + limit
 * - salesPages: isActive==true | mentorId== + isActive==
 * - users: documentId in [...30] + subscription.status==active | doc directo
 * - tags: documentId in
 * - categories (orden name asc), levels (orden order asc)
 * Cubre el camino con gateway completo (queryByFilters/getDocsByIds opcionales)
 * y el fallback (primitivas + filtro en memoria) con IDÉNTICO resultado.
 */
import { describe, expect, it, vi } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QueryFilterClause,
  QuerySnapshotLike,
} from '../gateway';
import type { RawDoc } from '../mappers';
import { FirestoreCategoryRepository } from '../category-repo';
import { FirestoreLevelRepository } from '../level-repo';
import { FirestoreCourseRepository } from '../course-repo';
import { FirestoreMarketplaceRepository } from '../marketplace-repo';

type Store = Record<string, Record<string, RawDoc>>;

function snap(id: string, raw: RawDoc): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

function getField(raw: RawDoc, field: string): unknown {
  if (field === '__name__') return undefined; // se maneja aparte
  return field.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as RawDoc)[part];
  }, raw);
}

function matchesFilters(id: string, raw: RawDoc, filters: readonly QueryFilterClause[]): boolean {
  return filters.every((f) => {
    const actual = f.field === '__name__' ? id : getField(raw, f.field);
    switch (f.op) {
      case '==':
        return actual === f.value;
      case '>':
        return typeof actual === 'number' && typeof f.value === 'number' && actual > f.value;
      case 'in':
        return Array.isArray(f.value) && (f.value as unknown[]).includes(actual);
      case 'array-contains':
        return Array.isArray(actual) && actual.includes(f.value);
      default:
        return false;
    }
  });
}

interface Call {
  readonly kind: string;
  readonly collectionPath: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly filters?: readonly QueryFilterClause[];
  readonly limit?: number;
  readonly ids?: readonly string[];
}

/** Gateway completo: implementa los opcionales queryByFilters/getDocsByIds. */
class FullFakeGateway implements FirestoreGateway {
  readonly calls: Call[] = [];
  readonly created: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  private docsOf(collectionPath: string): [string, RawDoc][] {
    return Object.entries(this.store[collectionPath] ?? {});
  }

  async getDoc(collectionPath: string, id: string) {
    this.calls.push({ kind: 'getDoc', collectionPath });
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
  }

  async listDocs(collectionPath: string, limit?: number): Promise<QuerySnapshotLike> {
    this.calls.push({ kind: 'listDocs', collectionPath, limit });
    const docs = this.docsOf(collectionPath)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    this.calls.push({ kind: 'queryByField', collectionPath, field, value, limit });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field) === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ) {
    this.calls.push({ kind: 'queryByTwoFields', collectionPath, field: `${field1}+${field2}`, limit });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field1) === value1 && getField(raw, field2) === value2)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryArrayContains(collectionPath: string, field: string, value: unknown, limit?: number) {
    this.calls.push({ kind: 'queryArrayContains', collectionPath, field, value, limit });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => {
        const actual = getField(raw, field);
        return Array.isArray(actual) && actual.includes(value);
      })
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByFilters(
    collectionPath: string,
    filters: readonly QueryFilterClause[],
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    this.calls.push({ kind: 'queryByFilters', collectionPath, filters, limit });
    const docs = this.docsOf(collectionPath)
      .filter(([id, raw]) => matchesFilters(id, raw, filters))
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async getDocsByIds(collectionPath: string, ids: readonly string[]): Promise<QuerySnapshotLike> {
    this.calls.push({ kind: 'getDocsByIds', collectionPath, ids });
    const docs = ids
      .map((id) => {
        const raw = this.store[collectionPath]?.[id];
        return raw === undefined ? null : snap(id, raw);
      })
      .filter((d): d is DocSnapshotLike => d !== null);
    return { docs };
  }

  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.created.push({ collectionPath, id, data });
    this.store[collectionPath][id] = data;
  }

  async updateDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteDoc(): Promise<void> {
    throw new Error('no usado');
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }
}

/** Gateway mínimo: SIN los opcionales (fuerza el fallback a primitivas). */
class MinimalFakeGateway extends FullFakeGateway {
  // Se sombrean con undefined para que `gateway.queryByFilters` sea
  // falsy igual que en los gateways viejos que no lo implementan.
  queryByFilters = undefined as never;
  getDocsByIds = undefined as never;
}

function catalogStore(): Store {
  return {
    courses: {
      c1: { mentorId: 'm1', title: 'Gratis', status: 'published', isActive: true, publicListing: true, price: 0 },
      c2: { mentorId: 'm2', title: 'Pago', status: 'published', isActive: true, publicListing: true, price: 50 },
      cDraft: { mentorId: 'm1', title: 'Borrador', status: 'draft', isActive: true, publicListing: true, price: 0 },
      cHidden: { mentorId: 'm1', title: 'Oculto', status: 'published', isActive: true, publicListing: false, price: 10 },
      cOff: { mentorId: 'm1', title: 'Apagado', status: 'published', isActive: false, publicListing: true, price: 5 },
    },
    salesPages: {
      sp1: { mentorId: 'm1', courseId: 'c1', isActive: true, title: 'Landing 1' },
      sp2: { mentorId: 'm2', courseId: 'c2', isActive: true, title: 'Landing 2' },
      spOff: { mentorId: 'm1', courseId: 'c1', isActive: false, title: 'Apagada' },
    },
    users: {
      m1: { displayName: 'Ana', roles: ['mentor'], subscription: { status: 'active' } },
      m2: { displayName: 'Beto', roles: ['mentor'], subscription: { status: 'active' } },
      m3: { displayName: 'Corp', roles: ['mentor'], subscription: { status: 'active', isEnterprise: true } },
    },
    tags: {
      t1: { name: 'Yoga' },
      t2: { name: 'Negocios' },
    },
    categories: {
      catB: { name: 'Negocios' },
      catA: { name: 'Arte' },
      catBad: { name: '' },
    },
    levels: {
      l2: { name: 'Avanzado', order: 2 },
      l1: { name: 'Inicial', order: 0 },
      lBad: { name: 'Roto' },
    },
  };
}

describe('FirestoreCategoryRepository', () => {
  it('listAll lee categories ordenado por nombre y omite corruptos', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreCategoryRepository(gateway);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listAll();
      expect(list.map((c) => c.name)).toEqual(['Arte', 'Negocios']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'categories' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreLevelRepository', () => {
  it('listAll lee levels ordenado por order y omite corruptos', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreLevelRepository(gateway);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listAll();
      expect(list.map((l) => l.name)).toEqual(['Inicial', 'Avanzado']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'levels' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreCourseRepository (métodos aditivos F1.2)', () => {
  it('findAuthor lee users/{mentorId} con roles y suscripción crudos', async () => {
    const gateway = new FullFakeGateway({
      users: {
        m1: { roles: ['mentor'], subscription: { status: 'active', endDate: '2030-01-01', maxSimultaneousCourses: 3 } },
        admin: { roles: ['admin'] },
      },
    });
    const repo = new FirestoreCourseRepository(gateway);
    expect(await repo.findAuthor('m1')).toEqual({
      isAdmin: false,
      subscription: { status: 'active', endDate: '2030-01-01', maxSimultaneousCourses: 3 },
    });
    expect(await repo.findAuthor('admin')).toEqual({ isAdmin: true, subscription: undefined });
    expect(await repo.findAuthor('missing')).toBeNull();
  });

  it('countActiveCoursesByMentor cuenta solo isActive===true', async () => {
    const gateway = new FullFakeGateway({
      courses: {
        a: { mentorId: 'm1', isActive: true },
        b: { mentorId: 'm1', isActive: false },
        c: { mentorId: 'm1' },
        d: { mentorId: 'm2', isActive: true },
      },
    });
    const repo = new FirestoreCourseRepository(gateway);
    expect(await repo.countActiveCoursesByMentor('m1')).toBe(1);
    expect(gateway.calls[0]).toMatchObject({ collectionPath: 'courses', field: 'mentorId', value: 'm1' });
  });

  it('createCourse escribe en courses/{id} con createdAt/updatedAt', async () => {
    const gateway = new FullFakeGateway({ courses: {} });
    const repo = new FirestoreCourseRepository(gateway);
    await repo.createCourse({ id: 'c9', mentorId: 'm1', data: { title: 'Nuevo' } });
    expect(gateway.created).toHaveLength(1);
    expect(gateway.created[0]).toMatchObject({ collectionPath: 'courses', id: 'c9' });
    const data = gateway.created[0].data;
    expect(data).toMatchObject({ title: 'Nuevo', id: 'c9', mentorId: 'm1' });
    expect(data.createdAt).toEqual({ __fakeTimestamp: true });
    expect(data.updatedAt).toEqual({ __fakeTimestamp: true });
  });
});

describe('FirestoreMarketplaceRepository', () => {
  it('listMarketplaceCourses filtra isActive+published+publicListing+price con limit (gateway completo)', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreMarketplaceRepository(gateway);
    const free = await repo.listMarketplaceCourses('free', 12);
    expect(free.map((d) => d.id)).toEqual(['c1']);
    const call = gateway.calls[0];
    expect(call).toMatchObject({ kind: 'queryByFilters', collectionPath: 'courses', limit: 12 });
    expect(call.filters).toEqual([
      { field: 'isActive', op: '==', value: true },
      { field: 'status', op: '==', value: 'published' },
      { field: 'publicListing', op: '==', value: true },
      { field: 'price', op: '==', value: 0 },
    ]);
  });

  it('listMarketplaceCourses paid usa price > 0 y respeta limit', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreMarketplaceRepository(gateway);
    const paid = await repo.listMarketplaceCourses('paid', 1);
    expect(paid.map((d) => d.id)).toEqual(['c2']);
    expect(gateway.calls[0].filters).toContainEqual({ field: 'price', op: '>', value: 0 });
  });

  it('listMarketplaceCourses fallback (sin queryByFilters) da idéntico resultado', async () => {
    const full = new FullFakeGateway(catalogStore());
    const minimal = new MinimalFakeGateway(catalogStore());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const price of ['all', 'free', 'paid'] as const) {
        const a = await new FirestoreMarketplaceRepository(full).listMarketplaceCourses(price, 12);
        const b = await new FirestoreMarketplaceRepository(minimal).listMarketplaceCourses(price, 12);
        expect(b.map((d) => d.id).sort()).toEqual(a.map((d) => d.id).sort());
      }
      expect(minimal.calls[0].kind).toBe('queryByField');
    } finally {
      warn.mockRestore();
    }
  });

  it('listActiveSalesPages filtra isActive==true', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreMarketplaceRepository(gateway);
    const pages = await repo.listActiveSalesPages();
    expect(pages.map((d) => d.id).sort()).toEqual(['sp1', 'sp2']);
    expect(gateway.calls[0]).toMatchObject({ collectionPath: 'salesPages', field: 'isActive', value: true });
  });

  it('listSalesPagesByMentorActive usa mentorId+isActive y su fallback coincide', async () => {
    const full = new FullFakeGateway(catalogStore());
    const minimal = new MinimalFakeGateway(catalogStore());
    const a = await new FirestoreMarketplaceRepository(full).listSalesPagesByMentorActive('m1');
    expect(a.map((d) => d.id)).toEqual(['sp1']);
    expect(full.calls[0].kind).toBe('queryByTwoFields');
    const b = await new FirestoreMarketplaceRepository(minimal).listSalesPagesByMentorActive('m1');
    expect(b.map((d) => d.id)).toEqual(['sp1']);
  });

  it('listCoursesByIds/listTagsByIds/listTutorsByIds usan getDocsByIds y el fallback coincide', async () => {
    const full = new FullFakeGateway(catalogStore());
    const minimal = new MinimalFakeGateway(catalogStore());
    const repoFull = new FirestoreMarketplaceRepository(full);
    const repoMin = new FirestoreMarketplaceRepository(minimal);

    expect((await repoFull.listCoursesByIds(['c1', 'c2', 'missing'])).map((d) => d.id)).toEqual(['c1', 'c2']);
    expect((await repoMin.listCoursesByIds(['c1', 'c2', 'missing'])).map((d) => d.id)).toEqual(['c1', 'c2']);
    expect(full.calls[0]).toMatchObject({ kind: 'getDocsByIds', collectionPath: 'courses' });

    expect((await repoFull.listTagsByIds(['t1'])).map((d) => d.id)).toEqual(['t1']);
    expect((await repoMin.listTagsByIds(['t1'])).map((d) => d.id)).toEqual(['t1']);

    expect((await repoFull.listTutorsByIds(['m1', 'm3'])).map((d) => d.id).sort()).toEqual(['m1', 'm3']);
    expect((await repoMin.listTutorsByIds(['m1', 'm3'])).map((d) => d.id).sort()).toEqual(['m1', 'm3']);
  });

  it('findTutorById y getSalesPageById leen el documento directo', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreMarketplaceRepository(gateway);
    expect((await repo.findTutorById('m1'))?.data.displayName).toBe('Ana');
    expect(await repo.findTutorById('missing')).toBeNull();
    expect((await repo.getSalesPageById('sp1'))?.data.title).toBe('Landing 1');
    expect(await repo.getSalesPageById('missing')).toBeNull();
  });

  it('listMentors usa roles array-contains mentor y su fallback coincide', async () => {
    const full = new FullFakeGateway(catalogStore());
    const minimal = new MinimalFakeGateway(catalogStore());
    const a = await new FirestoreMarketplaceRepository(full).listMentors();
    expect(a.map((d) => d.id).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(full.calls[0].kind).toBe('queryArrayContains');
    const b = await new FirestoreMarketplaceRepository(minimal).listMentors();
    expect(b.map((d) => d.id).sort()).toEqual(['m1', 'm2', 'm3']);
  });

  it('listActiveCourses, listCategoriesRaw y listLevelsRaw con orden legacy', async () => {
    const gateway = new FullFakeGateway(catalogStore());
    const repo = new FirestoreMarketplaceRepository(gateway);
    expect((await repo.listActiveCourses()).map((d) => d.id).sort()).toEqual(['c1', 'c2', 'cDraft', 'cHidden']);
    // '' primero: igual que orderBy server (Firestore ordena '' antes).
    expect((await repo.listCategoriesRaw()).map((d) => d.data.name)).toEqual(['', 'Arte', 'Negocios']);
    expect((await repo.listLevelsRaw()).map((d) => d.data.name)).toEqual(['Roto', 'Inicial', 'Avanzado']);
  });
});
